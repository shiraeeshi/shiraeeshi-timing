const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');
const { parseNotebook } = require('../../logic/notebook_parser.js');

export async function showNotebook() {

  await createWindow();

}

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    // frame: false,
		webPreferences: {
      preload: path.join(__dirname, 'view/notebook/preload.js')
		}
  })

  win.loadFile('dist-frontend/notebook/notebook.html')

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

async function init(win) {

  ipcMain.on('msg', (_event, msg) => {
    console.log(`[main.js] message from notebook: ${msg}`);
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

  const homeDirPath = app.getPath('home');

  const configFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'config', 'indic.config.txt');
  console.log(`configFilepath: ${configFilepath}`);
  const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });
  const config = JSON.parse(configFileContents);
  const notebookContentsParsed = await parseNotebook(config['notebook-filepath']);

  func({
    "processes": notebookContentsParsed,
  });
}

