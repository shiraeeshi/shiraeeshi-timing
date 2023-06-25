const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem, clipboard } = electron;
const path = require('path')
const fs = require('fs');
const YAML = require('yaml');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');
const { parseNotebook } = require('../../logic/notebook_parser.js');
const { expanduser } = require('../../logic/file_utils.js');

ipcMain.on('notebook_msgs__save_notebook', async (event, preYamlJson, filepath) => {
  try {
    // console.log(`notebook_msgs__save_notebook filepath: ${filepath}`);
    console.dir(Object.keys(preYamlJson));
    let stringified = YAML.stringify(preYamlJson, undefined, {indent: 2, indentSeq: false});
    const filepathWithExpandedUser = expanduser(filepath);
    const dirname = path.dirname(filepathWithExpandedUser);
    const ext = path.extname(filepath);
    const filenameNoExt = path.basename(filepath, ext);
    let suffix = (function() {
      const date = new Date();

      function pad(v) {
        return `0${v}`.slice(-2);
      }

      let day = pad(date.getDate());
      let month = pad(date.getMonth() + 1);
      let year = date.getFullYear()
      let hours = pad(date.getHours());
      let minutes = pad(date.getMinutes());
      let seconds = pad(date.getSeconds());
      return `_${year}_${month}_${day}__${hours}_${minutes}_${seconds}`;
    })();

    const copyTo = path.join(dirname, filenameNoExt + suffix + ext);
    await fs.promises.copyFile(filepathWithExpandedUser, copyTo);
    await fs.promises.writeFile(filepathWithExpandedUser, stringified);
    event.sender.send('message-from-backend', {
      type: 'save_result',
      result: 'success'
    });
  } catch (err) {
    event.sender.send('message-from-backend', {
      type: 'save_result',
      result: 'error',
      error_message: err.message
    });
  }
});

ipcMain.on('notebook_msgs__show_context_menu', async (event, sourceType) => {
  if (sourceType === 'notebook-node') {
    showContextMenuOfNotebookNode(event);
  } else if (sourceType === 'tags-tree-node') {
    showContextMenuOfTagsTreeNode(event);
  }
});


ipcMain.on('notebook_msgs__copy_full_path_of_tag', async (event, fullPathStr) => {
  clipboard.writeText(fullPathStr);
});

let isDisabledShortcuts = false;

ipcMain.on('notebook_msgs__disable_shortcuts', async (_event) => {
  isDisabledShortcuts = true;
});

ipcMain.on('notebook_msgs__enable_shortcuts', async (_event) => {
  isDisabledShortcuts = false;
});

export async function showNotebook(appEnv) {

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // frame: false,
		webPreferences: {
      preload: path.join(__dirname, 'view/notebook/preload.js')
		}
  })

  // win.openDevTools();
  win.loadFile('dist-frontend/notebook/notebook.html')

  setMenuAndKeyboardShortcuts(win);

  await init(appEnv, win);
}

function setMenuAndKeyboardShortcuts(win) {

  let isFullScreen = false;
  
  const menu = new Menu();
  menu.append(new MenuItem({
    label: 'Shiraeeshi',
    submenu: [
      {
        label: 'save',
        click: () => {
          // let window = electron.remote.getCurrentWindow();
          win.webContents.send('message-from-backend', {
            type: 'save-command'
          });
        }
      },
      {
        label: 'toggle fullscreen',
        accelerator: process.platform === 'darwin' ? 'f' : 'f',
        click: () => {
          if (isDisabledShortcuts) {
            return;
          }
          isFullScreen = !isFullScreen;
          // let window = electron.remote.getCurrentWindow();
          win.setFullScreen(isFullScreen);
        }
      },
      {
        label: 'Escape',
        accelerator: 'Escape',
        click: () => {
          if (isDisabledShortcuts) {
            return;
          }
          if (isFullScreen) {
            isFullScreen = false;
            win.setFullScreen(false);
          } else {
            win.close();
          }
        }
      },
      {
        label: 'open devtools',
        accelerator: 'Ctrl+Shift+J',
        click: () => {
          win.openDevTools();
        }
      },
      {
        role: 'help',
        accelerator: process.platform === 'darwin' ? 'h' : 'h',
        click: () => {
          console.log('---===[ menu item clicked ]===---')
        }
      }
    ]
  }));
  
  Menu.setApplicationMenu(menu);
}

function MessageSender(win) {
  let that = this;
  that.win = win;
  that.hasWindowLoaded = false;
  that.messagesToSend = [];
  win.webContents.once('dom-ready', () => {
    that.hasWindowLoaded = true;
    that._sendMessages();
  })
}

MessageSender.prototype.send = function(msg) {
  let that = this;
  that.messagesToSend.push(msg);
  if (that.hasWindowLoaded) {
    that._sendMessages();
  }
}

MessageSender.prototype._sendMessages = function(msg) {
  let that = this;
  let win = that.win;
  for (let msg of that.messagesToSend) {
    win.webContents.send('message-from-backend', msg);
  }
  that.messagesToSend = [];
}

async function init(appEnv, win) {

  ipcMain.on('msg', (_event, msg) => {
    console.log(`[main.js] message from notebook: ${msg}`);
  });

  let messageSender = new MessageSender(win);

  function func(msg) {
    messageSender.send(msg);
  }

  const homeDirPath = app.getPath('home');

  let configFilepath;
  if (appEnv.stage === 'production') {
    configFilepath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'config', 'indic.config.txt');
  } else {
    configFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'config', 'indic.config.txt');
  }
  console.log(`configFilepath: ${configFilepath}`);
  const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });
  const config = convertConfigFromYamlFormat(YAML.parse(configFileContents));

  if (config.notebook === undefined) {
    func({
      "type": "error_message",
      "message": "no notebook section found in config file"
    });
    return;
  }

  if (config.notebook['filepath'] === undefined) {
    func({
      "type": "error_message",
      "message": "no notebook filepath found in config file ('filepath' field under 'notebook' section)"
    });
    return;
  }

  let notebookContentsParsed;
  try {
    notebookContentsParsed = await parseNotebook(config.notebook['filepath']);
  } catch (err) {
    func({
      "type": "error_message",
      "notebook_location": config['notebook-filepath'],
      "message": err.message
    });
    return;
  }

  func({
    "notes": notebookContentsParsed,
    "config": config
  });
}


function showContextMenuOfNotebookNode(event) {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Menu Item 1',
      click: () => {
        event.sender.send('message-from-backend', {
          type: 'contextmenu',
          value: 'Menu Item 1'
        });
      }
    },
    {
      label: 'Menu Item 2',
      click: () => {
        event.sender.send('message-from-backend', {
          type: 'contextmenu',
          value: 'Menu Item 2'
        });
      }
    },
  ]);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
}

function showContextMenuOfTagsTreeNode(event) {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Copy full path',
      click: () => {
        event.sender.send('message-from-backend', {
          type: 'contextmenu',
          value: 'copy-full-path'
        });
      }
    },
    {
      label: 'Edit full path',
      click: () => {
        event.sender.send('message-from-backend', {
          type: 'contextmenu',
          value: 'edit-full-path'
        });
      }
    },
  ]);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
}


function convertConfigFromYamlFormat(config) {
  config.timings.forEach(timingsFileInfo => {
    if (timingsFileInfo['category-path'] !== undefined) {
      timingsFileInfo.categoryPath = timingsFileInfo['category-path'];
      delete timingsFileInfo['category-path'];
    }
  });
  return config;
}

