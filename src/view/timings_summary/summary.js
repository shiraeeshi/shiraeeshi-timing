const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');

export async function showTimingsSummary() {

  ipcMain.on('msg', (_event, msg) => {
    console.log(`[main.js] message from timing_summary: ${msg}`);
  });

  await createWindow();

}

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    // frame: false,
		webPreferences: {
      preload: path.join(__dirname, 'view/timings_summary/preload.js')
		}
  })

  win.loadFile('dist-frontend/timings_summary.html')

  setMenuAndKeyboardShortcuts(win);

  await init(win);
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

async function init(win) {

  function func(msg) {
    console.log('[main.js] createWindow -> func');
    let hasWindowLoaded = false;
    let hasDataBeenSent = false;

    win.webContents.once('dom-ready', () => {
      hasWindowLoaded = true;
      if (!hasDataBeenSent) {
        win.webContents.send('message-from-backend', msg);
        hasDataBeenSent = true;
      }
    });

    if (!hasDataBeenSent && hasWindowLoaded) {
      win.webContents.send('message-from-backend', msg);
      hasDataBeenSent = true;
    }
  }

  const homeDirPath = app.getPath('home');

  const configFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'config', 'indic.config.txt');
  console.log(`configFilepath: ${configFilepath}`);
  const indexDirFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'indexes');
  console.log(`indexDirFilepath: ${indexDirFilepath}`);
  const timing2indexFilename = await createOrRefreshIndex(configFilepath, indexDirFilepath);
  console.log('[init] 1');
  const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });
  console.log('[init] 2');
  const config = JSON.parse(configFileContents);
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
  const timingsOfFiveLastDays = await readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, fiveDaysAgo, today);
  console.log('[init] 4');

  console.log(`[main.js] timingsOfFiveLastDays: ${JSON.stringify(timingsOfFiveLastDays)}`);
  console.log('[init] 5');

  func(timingsOfFiveLastDays);
  console.log('[init] 6');

  const wallpapersDirPath = path.join(homeDirPath, 'test_pm_app2', 'wallpapers');
  const wallpapersFilenames = await fs.promises.readdir(wallpapersDirPath, { encoding: 'utf8' });
  console.log('[init] 7');
  console.log(`wallpapersFilenames: ${wallpapersFilenames}`);
  const relativePathToWallpapersDir = path.relative('dist-frontend', wallpapersDirPath);
  console.log(`relativePathToWallpapersDir: ${relativePathToWallpapersDir}`);


  func({
    "type": "wallpapers",
    "wallpapers": wallpapersFilenames.map(n => path.join(relativePathToWallpapersDir, n))
  });
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


