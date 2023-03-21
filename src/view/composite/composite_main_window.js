const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');
const { parseNotebook } = require('../../logic/notebook_parser.js');

export async function showCompositeMainWindow(appEnv) {

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    // frame: false,
		webPreferences: {
      preload: path.join(__dirname, 'view/composite/preload.js')
		}
  })

  win.loadFile('dist-frontend/composite/composite_main_window.html')

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

async function init(appEnv, win) {

  ipcMain.on('msg_from_timing_summary', (_event, msg) => {
    console.log(`[main.js] message from timing_summary: ${msg}`);
  });

  ipcMain.on('msg_from_notebook', (_event, msg) => {
    console.log(`[main.js] message from notebook: ${msg}`);
  });

  ipcMain.on('msg', (_event, msg) => {
    console.log(`[main.js] message from composite_main_window: ${msg}`);
  });

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

  console.log(`process.argv: ${JSON.stringify(process.argv)}`);

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
  console.log(`[composite_main_window] configFilepath: ${configFilepath}`);
  console.log(`[composite_main_window] indexDirFilepath: ${indexDirFilepath}`);
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

  const notebookContentsParsed = await parseNotebook(config['notebook-filepath']);

  console.log('[init] 6');

  func({
    "processes": notebookContentsParsed,
    "timings": timingsOfFiveLastDays,
  });

  let wallpapersDirPath;
  if (appEnv.stage === 'production') {
    wallpapersDirPath = path.join(homeDirPath, 'pm_app', 'wallpapers');
  } else {
    wallpapersDirPath = path.join(homeDirPath, 'test_pm_app2', 'wallpapers');
  }
  const wallpapersFilenames = await fs.promises.readdir(wallpapersDirPath, { encoding: 'utf8' });
  console.log('[init] 7');
  console.log(`wallpapersFilenames: ${wallpapersFilenames}`);
  const pathOfComposite = path.join('dist-frontend', 'composite')
  const relativePathToWallpapersDir = path.relative(pathOfComposite, wallpapersDirPath);
  console.log(`relativePathToWallpapersDir: ${relativePathToWallpapersDir}`);


  func({
    "type": "wallpapers",
    "wallpapers": wallpapersFilenames.map(n => path.join(relativePathToWallpapersDir, n))
  });
}

