const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const YAML = require('yaml');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');
const { parseNotebook } = require('../../logic/notebook_parser.js');

export async function showCompositeMainWindow(appEnv) {

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  const win = new BrowserWindow({
    width: 1400,
    height: 1200,
    // frame: false,
		webPreferences: {
      preload: path.join(__dirname, 'view/composite/preload.js')
		}
  })

  win.loadFile('dist-frontend/composite/composite_main_window.html')

  await init(appEnv, win);
}

function setMenuAndKeyboardShortcuts(win, config, configFilepath, indexDirFilepath, messageSender) {

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
        label: 'previous day (in history)',
        accelerator: 'Left',
        click: () => {
          const msg = {
            "type": "key_pressed",
            "keyval": "Left"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'next day (in history)',
        accelerator: 'Right',
        click: () => {
          const msg = {
            "type": "key_pressed",
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

  menu.append(new MenuItem({
    label: 'view',
    submenu: [
      {
        label: 'timings summary',
        accelerator: 'Ctrl+S',
        click: async () => {

          const today = new Date();
          const threeDaysAgo = new Date();

          threeDaysAgo.setDate(threeDaysAgo.getDate() - 5);

          today.setHours(0);
          today.setMinutes(0);
          today.setSeconds(0);
          threeDaysAgo.setHours(0);
          threeDaysAgo.setMinutes(0);
          threeDaysAgo.setSeconds(0);

          const timing2indexFilename = await createOrRefreshIndex(configFilepath, indexDirFilepath);

          await readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, threeDaysAgo, today)
            .then(timingsOfThreeLastDays => {
              console.log(`[main.js] timingsOfThreeLastDays: ${JSON.stringify(timingsOfThreeLastDays)}`);
              let msg = {
                "type": "key_pressed",
                "keyval": "Ctrl+S",
                "timings": timingsOfThreeLastDays,
                "config": config,
              };
              messageSender.send(msg);
            })
            .catch(err => {
              messageSender.send({
                "type": "error_message",
                "error_source": "timings",
                "source_timing": err.source_timing,
                "source_timing_location": err.source_timing_location,
                "lineNumOffset": err.lineNumOffset,
                "message": err.message
              });
            });
        }
      },
      {
        label: 'timings history',
        accelerator: 'Ctrl+H',
        click: () => {
          const msg = {
            "type": "key_pressed",
            "keyval": "Ctrl+H",
            "config": config,
          };
          messageSender.send(msg);
        }
      },
      {
        label: 'timings frequencies',
        accelerator: 'Ctrl+F',
        click: () => {
          const msg = {
            "type": "key_pressed",
            "keyval": "Ctrl+F"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
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

  ipcMain.on('msg_from_timing_summary', (_event, msg) => {
    console.log(`[main.js] message from timing_summary: ${msg}`);
  });

  ipcMain.on('msg_from_history', (_event, msg) => {
    console.log(`[main.js] message from history: ${msg}`);
  });

  ipcMain.on('msg_from_notebook', (_event, msg) => {
    console.log(`[main.js] message from notebook: ${msg}`);
  });

  ipcMain.on('msg', (_event, msg) => {
    console.log(`[main.js] message from composite_main_window: ${msg}`);
  });

  let messageSender = new MessageSender(win);

  function func(msg) {
    messageSender.send(msg);
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
  const config = YAML.parse(configFileContents);

  registerFrequenciesRequestHandler(ipcMain, win, config, configFilepath, indexDirFilepath, messageSender);
  registerHistoryRequestHandler(ipcMain, win, config, configFilepath, indexDirFilepath, messageSender);

  setMenuAndKeyboardShortcuts(win, config, configFilepath, indexDirFilepath, messageSender);

  const today = new Date();
  const threeDaysAgo = new Date();

  threeDaysAgo.setDate(threeDaysAgo.getDate() - 5);

  // today.setTime(Date.parse(dateAsYearMonthDayWithHyphens(today) + "T00:00:00")); // format: "YYYY-mm-ddT00:00:00"
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);
  // threeDaysAgo.setTime(Date.parse(dateAsYearMonthDayWithHyphens(threeDaysAgo) + "T00:00:00")); // format: "YYYY-mm-ddT00:00:00"
  threeDaysAgo.setHours(0);
  threeDaysAgo.setMinutes(0);
  threeDaysAgo.setSeconds(0);

  // console.log(`[main.js] threeDaysAgo: ${threeDaysAgo}, today: ${today}`);
  // console.log(`[main.js] threeDaysAgo: ${dateAsDayMonthYearWithDots(threeDaysAgo)}, today: ${dateAsDayMonthYearWithDots(today)}`);

  let sentConfig = false;

  console.log('[init] 3');
  readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, threeDaysAgo, today)
    .then(timingsOfThreeLastDays => {
      console.log(`[main.js] timingsOfThreeLastDays: ${JSON.stringify(timingsOfThreeLastDays)}`);
      let msg = {
        "type": "timings",
        "timings": timingsOfThreeLastDays,
      };
      if (!sentConfig) {
        msg.config = config;
        sentConfig = true;
      }
      func(msg);
    })
    .catch(err => {
      func({
        "type": "error_message",
        "error_source": "timings",
        "source_timing": err.source_timing,
        "source_timing_location": err.source_timing_location,
        "lineNumOffset": err.lineNumOffset,
        "message": err.message
      });
    });

  if (config.notebook === undefined) {
    func({
      "type": "error_message",
      "error_source": "notebook",
      "message": "no notebook section found in config file"
    });
  } else if (config.notebook['filepath'] === undefined) {
    func({
      "type": "error_message",
      "error_source": "notebook",
      "message": "no notebook filepath found in config file ('filepath' field under 'notebook' section)"
    });
  } else {
    parseNotebook(config.notebook['filepath'])
      .then(notebookContentsParsed => {
        let msg = {
          "type": "notebook",
          "notes": notebookContentsParsed,
        };
        if (!sentConfig) {
          msg.config = config;
          sentConfig = true;
        }
        func(msg);
      })
      .catch(err => {
        func({
          "type": "error_message",
          "error_source": "notebook",
          "notebook_location": config.notebook['filepath'],
          "message": err.message
        });
      });
  }

  let wallpapersDirPath;
  if (appEnv.stage === 'production') {
    wallpapersDirPath = path.join(homeDirPath, 'pm_app', 'wallpapers');
  } else {
    wallpapersDirPath = path.join(homeDirPath, 'test_pm_app2', 'wallpapers');
  }
  const wallpapersFilenames = await fs.promises.readdir(wallpapersDirPath, { encoding: 'utf8' });
  fs.promises.readdir(wallpapersDirPath, { encoding: 'utf8' })
    .then(wallpapersFilenames => {
      console.log(`wallpapersFilenames: ${wallpapersFilenames}`);
      const pathOfComposite = path.join('dist-frontend', 'composite')
      const relativePathToWallpapersDir = path.relative(pathOfComposite, wallpapersDirPath);
      console.log(`relativePathToWallpapersDir: ${relativePathToWallpapersDir}`);

      let msg = {
        "type": "wallpapers",
        "wallpapers": wallpapersFilenames.map(n => path.join(relativePathToWallpapersDir, n))
      };
      if (!sentConfig) {
        msg.config = config;
        sentConfig = true;
      }
      func(msg);
    });

}

function registerHistoryRequestHandler(ipcMain, win, config, configFilepath, indexDirFilepath, messageSender) {
  ipcMain.on('request_for_timings', async (_event, commaSeparaDatesWithDotsInThem) => {
    let datesWithDots = commaSeparaDatesWithDotsInThem.split(',');
    let firstDateWithDots = datesWithDots[0];
    let lastDateWithDots = datesWithDots[datesWithDots.length - 1];
    console.log(`[main.js] request_timings handler.\n  firstDateWithDots: ${firstDateWithDots}\n  lastDateWithDots: ${lastDateWithDots}`);
    let dateFrom = parseDateWithDots(firstDateWithDots);
    let dateTo = parseDateWithDots(lastDateWithDots);
    let timings;
    try {
      let timing2indexFilename = await createOrRefreshIndex(configFilepath, indexDirFilepath);
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
      console.log(`  ${timingName} length: ${timings[timingName].timingsByDays.length}`);
    }
    let msg = {
      msg_type: "timings_query_response",
      timings: timings,
    };
    // win.webContents.send('message-from-backend', msg);
    await messageSender.send(msg);
  });
}

function registerFrequenciesRequestHandler(ipcMain, win, config, configFilepath, indexDirFilepath, messageSender) {

  ipcMain.on('timings_frequencies_msgs__timings_for_period', async (_event, periodStr) => {
    let datesWithDots = periodStr.split(' - ');
    if (datesWithDots.length !== 2) {
      throw new Error("timings_frequencies_msgs__timings_for_period handler. error: unexpected request parameter value (expected two dates with ' - ' between them)");
    }
    let firstDateWithDots = datesWithDots[0];
    let lastDateWithDots = datesWithDots[1];
    console.log(`[main.js] request_timings handler.\n  firstDateWithDots: ${firstDateWithDots}\n  lastDateWithDots: ${lastDateWithDots}`);
    let dateFrom = parseDateWithDots(firstDateWithDots);
    let dateTo = parseDateWithDots(lastDateWithDots);
    let timings;
    try {
      let timing2indexFilename = await createOrRefreshIndex(configFilepath, indexDirFilepath);
      timings = await readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, dateFrom, dateTo);
    } catch (err) {
      let msg = {
        msg_type: "error_message",
        source_timing: err.source_timing,
        source_timing_location: err.source_timing_location,
        lineNumOffset: err.lineNumOffset,
        message: err.message
      };
      console.log('[composite_main_window.js] about to send error message: ' + err.message);
      win.webContents.send('message-from-backend', msg);
      return;
    }
    // console.log(`[main.js] about to send timings to timing_history_latest.`);
    // for (const timingName in timings) {
    //   console.log(`  ${timingName} length: ${timings[timingName].length}`);
    // }
    let msg = {
      msg_type: "timings_query_response",
      timings: timings,
    };
    messageSender.send(msg);
    console.log('[composite_main_window.js] sent timings as a response to frequencies request for period');
  });
}

function parseDateWithDots(input) {
  let pad = v => `0${v}`.slice(-2);

  let parts = input.split('\.')
  let datePart = pad(parts[0]);
  let monthPart = pad(parts[1]);
  let yearPart = parts[2];
  let result = new Date();
  // console.log(`[parseDateWithDots] about to parse date "${input}": invoking Date.parse with ${yearPart}-${monthPart}-${datePart}T00:00:00`);
  result.setTime(Date.parse(`${yearPart}-${monthPart}-${datePart}T00:00:00`));
  // result.setFullYear(yearPart);
  // result.setMonth(monthPart);
  // result.setDate(datePart);
  // result.setHours(0);
  // result.setMinutes(0);
  // result.setSeconds(0);
  return result;
}
