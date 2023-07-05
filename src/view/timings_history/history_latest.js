const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const YAML = require('yaml');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');

export async function showHistoryLatest(appEnv) {

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
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
        label: 'toggle underlining the canvas',
        accelerator: 'Ctrl+L',
        click: () => {
          const msg = {
            "msg_type": "key_pressed",
            "keyval": "Ctrl+L"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'toggle minimal text mode',
        accelerator: 'm',
        click: () => {
          const msg = {
            "msg_type": "key_pressed",
            "keyval": "m"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'previous day',
        accelerator: 'Left',
        click: () => {
          const msg = {
            "msg_type": "key_pressed",
            "keyval": "Left"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'next day',
        accelerator: 'Right',
        click: () => {
          const msg = {
            "msg_type": "key_pressed",
            "keyval": "Right"
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
  let timing2indexFilename = await createOrRefreshIndex(configFilepath, indexDirFilepath);
  console.log('[init] 1');
  const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });
  console.log('[init] 2');
  const config = convertConfigFromYamlFormat(YAML.parse(configFileContents));

  console.log('[init] 3');
  await messageSender.send({
    msg_type: 'config',
    config: config
  });
  console.log('[init] 4');

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

  ipcMain.on('timings_history_latest_handle_request_for_timings', async (_event, commaSeparaDatesWithDotsInThem) => {
    let datesWithDots = commaSeparaDatesWithDotsInThem.split(',');
    let firstDateWithDots = datesWithDots[0];
    let lastDateWithDots = datesWithDots[datesWithDots.length - 1];
    console.log(`[main.js] request_timings handler.\n  firstDateWithDots: ${firstDateWithDots}\n  lastDateWithDots: ${lastDateWithDots}`);
    let dateFrom = parseDateWithDots(firstDateWithDots);
    let dateTo = parseDateWithDots(lastDateWithDots);
    let timings;
    try {
      timing2indexFilename = await createOrRefreshIndex(configFilepath, indexDirFilepath);
      timings = await readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, dateFrom, dateTo);
    } catch (err) {
      let msg = {
        "msg_type": "error_message",
        "source_timing": err.source_timing,
        "source_timing_location": err.source_timing_location,
        "lineNumOffset": err.lineNumOffset,
        "message": err.message
      };
      // win.webContents.send('message-from-backend', msg);
      await messageSender.send(msg);
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
    // win.webContents.send('message-from-backend', msg);
    await messageSender.send(msg);
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
