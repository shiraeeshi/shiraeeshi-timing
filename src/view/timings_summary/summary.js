const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const YAML = require('yaml');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');

ipcMain.on('msg', (_event, msg) => {
  console.log(`[main.js] message from timing_summary: ${msg}`);
});

export async function showTimingsSummary(appEnv) {

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    // frame: false,
		webPreferences: {
      preload: path.join(__dirname, 'view/timings_summary/preload.js')
		}
  })

  win.loadFile('dist-frontend/timings_summary.html')

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
        label: 'toggle fullscreen',
        accelerator: process.platform === 'darwin' ? 'f' : 'f',
        click: () => {
          isFullScreen = !isFullScreen;
          // let window = electron.remote.getCurrentWindow();
          win.setFullScreen(isFullScreen);
        }
      },
      {
        label: 'toggle minimal text mode',
        accelerator: 'm',
        click: () => {
          const msg = {
            "type": "key_pressed",
            "keyval": "m"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'toggle underlining the canvas',
        accelerator: 'Ctrl+L',
        click: () => {
          const msg = {
            "type": "key_pressed",
            "keyval": "Ctrl+L"
          };
          win.webContents.send('message-from-backend', msg);
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
        label: 'change wallpaper',
        accelerator: 'w',
        click: () => {
          const msg = {
            "type": "key_pressed",
            "keyval": "w"
          };
          win.webContents.send('message-from-backend', msg);
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

async function init(appEnv, win) {

  let messageSender = new MessageSender(win);

  async function func(msg) {
    await messageSender.send(msg);
  }

  const homeDirPath = app.getPath('home');

  let configFilepath;
  let indexDirFilepath;
  if (appEnv.stage === 'production') {
    configFilepath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'config', 'indic.config.txt');
    indexDirFilepath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'indexes');
  } else {
    configFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'config', 'indic.config.txt');
    indexDirFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'indexes');
  }
  console.log(`[summary.js] configFilepath: ${configFilepath}`);
  console.log(`[summary.js] indexDirFilepath: ${indexDirFilepath}`);
  const timing2indexFilename = await createOrRefreshIndex(configFilepath, indexDirFilepath);
  console.log('[init] 1');
  const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });
  console.log('[init] 2');
  const config = convertConfigFromYamlFormat(YAML.parse(configFileContents));
  const today = new Date();
  const fiveDaysAgo = new Date();

  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  // today.setTime(Date.parse(dateAsYearMonthDayWithHyphens(today) + "T00:00:00")); // format: "YYYY-mm-ddT00:00:00"
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);
  // fiveDaysAgo.setTime(Date.parse(dateAsYearMonthDayWithHyphens(fiveDaysAgo) + "T00:00:00")); // format: "YYYY-mm-ddT00:00:00"
  fiveDaysAgo.setHours(0);
  fiveDaysAgo.setMinutes(0);
  fiveDaysAgo.setSeconds(0);

  // console.log(`[main.js] fiveDaysAgo: ${fiveDaysAgo}, today: ${today}`);
  // console.log(`[main.js] fiveDaysAgo: ${dateAsDayMonthYearWithDots(fiveDaysAgo)}, today: ${dateAsDayMonthYearWithDots(today)}`);

  console.log('[init] 3');
  let timingsOfFiveLastDays;
  try {
    timingsOfFiveLastDays = await readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, fiveDaysAgo, today);
  } catch (err) {
    func({
      "type": "error_message",
      "source_timing": err.source_timing,
      "source_timing_location": err.source_timing_location,
      "lineNumOffset": err.lineNumOffset,
      "message": err.message
    });
  }
  console.log('[init] 4');

  console.log(`[main.js] timingsOfFiveLastDays: ${JSON.stringify(timingsOfFiveLastDays)}`);
  console.log('[init] 5');

  await func({
    config: config,
    timings: timingsOfFiveLastDays
  });
  console.log('[init] 6');

  let wallpapersDirPath;
  if (appEnv.stage === 'production') {
    wallpapersDirPath = path.join(homeDirPath, 'pm_app', 'wallpapers');
  } else {
    wallpapersDirPath = path.join(homeDirPath, 'test_pm_app2', 'wallpapers');
  }
  const wallpapersFilenames = await fs.promises.readdir(wallpapersDirPath, { encoding: 'utf8' });
  console.log('[init] 7');
  console.log(`wallpapersFilenames: ${wallpapersFilenames}`);
  const relativePathToWallpapersDir = path.relative('dist-frontend', wallpapersDirPath);
  console.log(`relativePathToWallpapersDir: ${relativePathToWallpapersDir}`);


  await func({
    "type": "wallpapers",
    "wallpapers": wallpapersFilenames.map(n => path.join(relativePathToWallpapersDir, n))
  });
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

// app.whenReady().then(async () => {
// 
//   ipcMain.on('msg', (_event, msg) => {
//     console.log(`[main.js] message from timing_summary: ${msg}`);
//   });
// 
//   await createWindow()
// 
//   app.on('activate', () => {
//     if (BrowserWindow.getAllWindows().length === 0) createWindow()
//   })
// })

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') app.quit()
// })

// let window = electron.remote.getCurrentWindow();


