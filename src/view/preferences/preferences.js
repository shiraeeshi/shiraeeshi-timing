const electron = require('electron');
const { app, dialog, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const YAML = require('yaml');

const { forgetLastModifiedTimeOfTimings } = require('../../logic/timing_index_manager.js');

let messageSender;
let win;
let appEnv;
let configFilepath;
let indexDirFilepath;

ipcMain.on('msg_choose_file', async (_event) => {
  let result = await dialog.showOpenDialog({properties: ['openFile', 'promptToCreate']});
  messageSender.send({
    type: 'filepicker_result',
    result: result
  });
});

ipcMain.on('msg_cancel', (_event) => {
  win.close();
});

ipcMain.on('msg_save', async (_event, msg) => {
  let {
    configWithNoTimings,
    timings,
    timingsToAdd,
    namesOfTimingsToDelete,
    changedTimings,
    changedTimingsConfig,
    changedNotebook
  } = msg;
  console.log('SAVE');
  console.dir(msg);

  try {
    const configFd = await fs.promises.open(configFilepath, 'w');
    let indent = 2;
    let config = createConfigToSave(configWithNoTimings, timings, namesOfTimingsToDelete);
    let data = YAML.stringify(config, indent);
    await fs.promises.writeFile(configFd, data, { encoding: 'utf8' });

    // forgetLastModifiedTimesIfNeeded(timings, timingsToAdd, namesOfTimingsToDelete);
    forgetLastModifiedTimesIfNeeded(timings);
  } catch (err) {
    messageSender.send({
      type: 'save_result',
      result: 'error',
      error_message: err.message
    });
    return;
  }
  messageSender.send({
    type: 'save_result',
    result: 'success'
  });
});

function createConfigToSave(configWithNoTimings, timings, namesOfTimingsToDelete) {
  namesOfTimingsToDelete = new Set(namesOfTimingsToDelete);
  let resultTimings = copyWithNoAdditionalFields(timings).filter(t => !namesOfTimingsToDelete.has(t.name));
  return Object.assign({}, configWithNoTimings, {timings: resultTimings});
}

function copyWithNoAdditionalFields(timingsFileInfos) {
  return timingsFileInfos.map(t => {
    let copy = Object.assign({}, t);
    delete copy.original;
    return copy;
  });
}

// function createTimingsByNames(timings) {
//   let result = {};
//   for (let t of timings) {
//     result[t.name] = t;
//   }
//   return result;
// }

function forgetLastModifiedTimesIfNeeded(timings) {
  let timingsFilesToUpdate = [];
  // let timingsByNames = createTimingsByNames(timings);
  for (let t of timings) {
    if (t.original !== undefined && t.filepath !== t.original.filepath) {
      timingsFilesToUpdate.push(t.name);
    }
  }
  console.log('[forgetLastModifiedTimesIfNeeded] timingsFilesToUpdate: ');
  console.dir(timingsFilesToUpdate);

  // only delete .last_modified files for timingsFilesToUpdate
  // the rest will be done when refreshing the index
  // ("the rest" means creating new indexes or deleting old unneeded indexes)
  forgetLastModifiedTimeOfTimings(timingsFilesToUpdate, indexDirFilepath);
}

export async function showPreferences(appEnvParam) {
  appEnv = appEnvParam;

  ipcMain.on('msg', (_event, msg) => {
    console.log(`[main.js] message from timing_summary: ${msg}`);
  });

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    // frame: false,
		webPreferences: {
      preload: path.join(__dirname, 'view/preferences/preload.js')
		}
  })

  setMenuAndKeyboardShortcuts(win);

  win.loadFile('dist-frontend/preferences/preferences.html')

  await init(appEnv, win);
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

MessageSender.prototype.send = async function(msg) {
  let that = this;
  that.messagesToSend.push(msg);
  if (that.hasWindowLoaded) {
    await that._sendMessages();
  }
}

MessageSender.prototype._sendMessages = async function(msg) {
  let that = this;
  let win = that.win;
  for (let msg of that.messagesToSend) {
    await win.webContents.send('message-from-backend', msg);
  }
  that.messagesToSend = [];
}

function setMenuAndKeyboardShortcuts(win) {

  let isFullScreen = false;
  
  const menu = new Menu();
  menu.append(new MenuItem({
    label: 'Shiraeeshi',
    submenu: [
      {
        label: 'toggle fullscreen',
        accelerator: process.platform === 'darwin' ? 'f' : 'f',
        click: () => {
          isFullScreen = !isFullScreen;
          // let window = electron.remote.getCurrentWindow();
          win.setFullScreen(isFullScreen);
        }
      },
      {
        label: 'Escape',
        accelerator: 'Escape',
        click: () => {
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

async function init(appEnv, win) {

  messageSender = new MessageSender(win);

  async function func(msg) {
    await messageSender.send(msg);
  }

  const homeDirPath = app.getPath('home');

  if (appEnv.stage === 'production') {
    configFilepath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'config', 'indic.config.txt');
    indexDirFilepath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'indexes');
  } else {
    configFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'config', 'indic.config.txt');
    indexDirFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'indexes');
  }

  console.log(`[preferences.js] configFilepath: ${configFilepath}`);
  console.log(`[preferences.js] indexDirFilepath: ${indexDirFilepath}`);

  const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });

  const config = YAML.parse(configFileContents);

  await func({
    config: config,
  });

  // let wallpapersDirPath;
  // if (appEnv.stage === 'production') {
  //   wallpapersDirPath = path.join(homeDirPath, 'pm_app', 'wallpapers');
  // } else {
  //   wallpapersDirPath = path.join(homeDirPath, 'test_pm_app2', 'wallpapers');
  // }
  // const wallpapersFilenames = await fs.promises.readdir(wallpapersDirPath, { encoding: 'utf8' });
  // console.log('[init] 7');
  // console.log(`wallpapersFilenames: ${wallpapersFilenames}`);
  // const relativePathToWallpapersDir = path.relative('dist-frontend', wallpapersDirPath);
  // console.log(`relativePathToWallpapersDir: ${relativePathToWallpapersDir}`);


  // await func({
  //   "type": "wallpapers",
  //   "wallpapers": wallpapersFilenames.map(n => path.join(relativePathToWallpapersDir, n))
  // });
}
