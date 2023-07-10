const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem, clipboard } = electron;
const path = require('path')
const fs = require('fs');
const YAML = require('yaml');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');
const { parseNotebook } = require('../../logic/notebook_parser.js');
const { saveNotebook } = require('../../logic/notebook_save.js');

ipcMain.on('notebook_msgs__save_notebook', async (event, preYamlJson, filepath) => {
  try {
    // console.log(`notebook_msgs__save_notebook filepath: ${filepath}`);
    console.dir(Object.keys(preYamlJson));
    await saveNotebook(preYamlJson, filepath);
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

ipcMain.on('notebook_msgs__show_context_menu', async (event, sourceType, options) => {
  if (sourceType === 'notebook-node') {
    showContextMenuOfNotebookNode(event, options);
  } else if (sourceType === 'tags-tree-node') {
    showContextMenuOfTagsTreeNode(event, options);
  }
});

ipcMain.on('notebook_msgs__show_notebook_container_context_menu', async (event, sourceType, options) => {
  if (sourceType === 'notes-top-panel') {
    showContextMenuOfNotebookNotesTopPanel(event, options);
  }
});


ipcMain.on('notebook_msgs__copy_full_path_of_tag', async (event, fullPathStr) => {
  clipboard.writeText(fullPathStr);
});






ipcMain.on('notebook_msgs__disable_shortcuts', async (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.isDisabledShortcuts = true;
});

ipcMain.on('notebook_msgs__enable_shortcuts', async (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.isDisabledShortcuts = false;
});






ipcMain.on('notebook_msgs__confirm_quit', async (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.confirmedQuit = true;
  win.close();
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

  win.on('close', (event) => {
    if (!win.confirmedQuit) {
      event.preventDefault();
      win.send('message-from-backend', {
        type: 'confirm_quit',
      });
    }
  });

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
          if (win.isDisabledShortcuts) {
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
          if (win.isDisabledShortcuts) {
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

function sendContextMenuCommand(event, command) {
  event.sender.send('message-from-backend', {
    type: 'contextmenu',
    value: command
  });
}

function showContextMenuOfNotebookNode(event, options) {
  const listOfMenuItems = [
    {
      label: 'Edit',
      click: () => {
        sendContextMenuCommand(event, 'edit')
      }
    },
    {
      label: 'Add sibling',
      click: () => {
        sendContextMenuCommand(event, 'add-sibling-with-input')
      }
    },
    {
      label: 'Append child',
      click: () => {
        sendContextMenuCommand(event, 'append-child-with-input')
      }
    },
    {
      label: 'Delete',
      click: () => {
        sendContextMenuCommand(event, 'delete')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Cut node',
      click: () => {
        sendContextMenuCommand(event, 'cut-node')
      }
    },
    {
      label: 'Copy node',
      click: () => {
        sendContextMenuCommand(event, 'copy-node')
      }
    },
    {
      label: 'Paste node',
      click: () => {
        sendContextMenuCommand(event, 'paste-node')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Increase font size',
      click: () => {
        sendContextMenuCommand(event, 'increase-font-size')
      }
    },
    {
      label: 'Decrease font size',
      click: () => {
        sendContextMenuCommand(event, 'decrease-font-size')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Move to top',
      click: () => {
        sendContextMenuCommand(event, 'move-to-top')
      }
    },
    {
      label: 'Move to bottom',
      click: () => {
        sendContextMenuCommand(event, 'move-to-bottom')
      }
    },
    {
      label: 'Hide',
      click: () => {
        sendContextMenuCommand(event, 'hide')
      }
    },
    {
      label: 'Hide siblings below',
      click: () => {
        sendContextMenuCommand(event, 'hide-siblings-below')
      }
    },
    {
      label: 'Unhide hidden children',
      enabled: options.hasHiddenChildren,
      click: () => {
        sendContextMenuCommand(event, 'unhide-hidden-children')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Open tag in tags tree',
      enabled: options.isTaggedNode,
      click: () => {
        sendContextMenuCommand(event, 'open-tag-in-tags-tree')
      }
    },
    {
      label: 'Open notes with the same tag in bottom panel',
      enabled: options.isTaggedNode,
      click: () => {
        sendContextMenuCommand(event, 'open-notes-with-the-same-tag-in-bottom-panel')
      }
    },
    {
      label: 'Open tags of children in tags tree',
      enabled: options.hasTaggedChildren,
      click: () => {
        sendContextMenuCommand(event, 'open-tags-of-children-in-tags-tree')
      }
    },
  ];
  if (!options.isTopPanelTree) {
    listOfMenuItems.push({
      type: 'separator'
    });
    listOfMenuItems.push({
      label: 'Open node in top panel',
      click: () => {
        sendContextMenuCommand(event, 'open-node-in-top-panel')
      }
    });
  }
  const menu = Menu.buildFromTemplate(listOfMenuItems);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
}

function showContextMenuOfTagsTreeNode(event, options) {
  let listOfMenuItems = [
    {
      label: 'Copy full path',
      click: () => {
        sendContextMenuCommand(event, 'copy-full-path');
      }
    },
    {
      label: 'Edit full path',
      click: () => {
        sendContextMenuCommand(event, 'edit-full-path');
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Edit',
      click: () => {
        sendContextMenuCommand(event, 'edit')
      }
    },
    {
      label: 'Increase font size',
      click: () => {
        sendContextMenuCommand(event, 'increase-font-size')
      }
    },
    {
      label: 'Decrease font size',
      click: () => {
        sendContextMenuCommand(event, 'decrease-font-size')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Move to top',
      click: () => {
        sendContextMenuCommand(event, 'move-to-top')
      }
    },
    {
      label: 'Move to bottom',
      click: () => {
        sendContextMenuCommand(event, 'move-to-bottom')
      }
    },
    {
      label: 'Hide',
      click: () => {
        sendContextMenuCommand(event, 'hide')
      }
    },
    {
      label: 'Hide siblings below',
      click: () => {
        sendContextMenuCommand(event, 'hide-siblings-below')
      }
    },
    {
      label: 'Unhide hidden children',
      enabled: options.hasHiddenChildren,
      click: () => {
        sendContextMenuCommand(event, 'unhide-hidden-children')
      }
    },
  ];
  if (!options.isTopPanelTree) {
    listOfMenuItems.push({
      type: 'separator'
    });
    listOfMenuItems.push({
      label: 'Open node in top panel',
      click: () => {
        sendContextMenuCommand(event, 'open-node-in-top-panel')
      }
    });
  }
  const menu = Menu.buildFromTemplate(listOfMenuItems);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
}


function showContextMenuOfNotebookNotesTopPanel(event, options) {
  let listOfMenuItems = [
    {
      label: 'Hide tags panel',
      enabled: !options.isHiddenTagsPanel,
      click: () => {
        sendContextMenuCommand(event, 'hide-tags-panel')
      }
    },
    {
      label: 'Show tags panel',
      enabled: options.isHiddenTagsPanel,
      click: () => {
        sendContextMenuCommand(event, 'show-tags-panel')
      }
    },
  ];
  const menu = Menu.buildFromTemplate(listOfMenuItems);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
}


function convertConfigFromYamlFormat(config) {
  config.timings.forEach(timingsFileInfo => {
    if (timingsFileInfo['category-path'] !== undefined) {
      timingsFileInfo.categoryPath = timingsFileInfo['category-path'];
      delete timingsFileInfo['category-path'];
    }
    if (timingsFileInfo['competitiveness-level'] !== undefined) {
      timingsFileInfo.competitivenessLevel = timingsFileInfo['competitiveness-level'];
      delete timingsFileInfo['competitiveness-level'];
    } else {
      timingsFileInfo.competitivenessLevel = 0;
    }
  });
  return config;
}

