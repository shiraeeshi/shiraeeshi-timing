const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');

export async function showHistoryLatest(appEnv) {

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    // frame: false,
		webPreferences: {
      preload: path.join(__dirname, 'view/timings_history/preload.js')
		}
  })

  win.loadFile('dist-frontend/timings_history/latest.html')

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

  func({
    "msg_type": "dummy_message",
  });

  await initMessageHandlers(appEnv, win);
}

async function initMessageHandlers(appEnv, win) {
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
  console.log(`configFilepath: ${configFilepath}`);
  console.log(`indexDirFilepath: ${indexDirFilepath}`);
  const timing2indexFilename = await createOrRefreshIndex(configFilepath, indexDirFilepath);
  console.log('[init] 1');
  const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });
  console.log('[init] 2');
  const config = JSON.parse(configFileContents);

  ipcMain.on('msg_from_timing_summary', (_event, msg) => {
    console.log(`[main.js] message from timing_summary: ${msg}`);
  });

  ipcMain.on('msg', (_event, msg) => {
    console.log(`[main.js] message from timing_history_latest: ${msg}`);
  });

  // ipcMain.handle('request_for_timings', async (_event, dateFrom, dateTo) => {
  //   const timings = await readTimingsForRangeOfDates(config, timing2indexFilename, dateFrom, dateTo);
  //   console.log(`[main.js] about to send timings to timing_history_latest: ${JSON.stringify(timings)}`);
  //   return timings;
  // });

  ipcMain.on('request_for_timings', async (_event, commaSeparaDatesWithDotsInThem) => {
    let datesWithDots = commaSeparaDatesWithDotsInThem.split(',');
    let firstDateWithDots = datesWithDots[0];
    let lastDateWithDots = datesWithDots[datesWithDots.length - 1];
    console.log(`[main.js] request_timings handler.\n  firstDateWithDots: ${firstDateWithDots}\n  lastDateWithDots: ${lastDateWithDots}`);
    let dateFrom = parseDateWithDots(firstDateWithDots);
    let dateTo = parseDateWithDots(lastDateWithDots);
    let timings;
    try {
      timings = await readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, dateFrom, dateTo);
    } catch (err) {
      let msg = {
        "msg_type": "error_message",
        "source_timing": err.source_timing,
        "message": err.message
      };
      win.webContents.send('message-from-backend', msg);
      return;
    }
    // console.log(`[main.js] about to send timings to timing_history_latest: ${JSON.stringify(timings)}`);
    console.log(`[main.js] about to send timings to timing_history_latest.`);
    for (const timingName in timings) {
      console.log(`  ${timingName} length: ${timings[timingName].length}`);
    }
    let msg = {
      msg_type: "timings_query_response",
      timings: timings,
    };
    win.webContents.send('message-from-backend', msg);
  });
}


function parseDateWithDots(input) {
  let parts = input.split('\.')
  let datePart = parts[0];
  let monthPart = parts[1];
  let yearPart = parts[2];
  let result = new Date();
  console.log(`[parseDateWithDots] about to parse date "${input}": invoking Date.parse with ${yearPart}-${monthPart}-${datePart}T00:00:00`);
  result.setTime(Date.parse(`${yearPart}-${monthPart}-${datePart}T00:00:00`));
  // result.setFullYear(yearPart);
  // result.setMonth(monthPart);
  // result.setDate(datePart);
  // result.setHours(0);
  // result.setMinutes(0);
  // result.setSeconds(0);
  return result;
}
