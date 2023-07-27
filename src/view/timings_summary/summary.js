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

ipcMain.on('timings_summary_msgs__toggle_fullscreen', (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  if (win.isDisabledShortcuts) {
    return;
  }
  let nextFullScreen = !win.isFullScreen();
  win.setFullScreen(nextFullScreen);
});

ipcMain.on('timings_summary_msgs__open_devtools', (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  if (win.isDisabledShortcuts) {
    return;
  }
  win.openDevTools();
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

  await init(appEnv, win);
}

function setMenuAndKeyboardShortcuts(win, config) {

  let shortcutsCfg;

  if (config.hotkeys === undefined) {
    config.hotkeys = {
      timings_summary_window: {
        shortcuts_of_main_menu: {}
      }
    };
  } else if (config.hotkeys.timings_summary_window === undefined) {
    config.hotkeys.timings_summary_window = {
      shortcuts_of_main_menu: {}
    };
  } else if (config.hotkeys.timings_summary_window.shortcuts_of_main_menu === undefined) {
    config.hotkeys.timings_summary_window.shortcuts_of_main_menu = {};
  }

  shortcutsCfg = config.hotkeys.timings_summary_window.shortcuts_of_main_menu;

  const menu = new Menu();
  menu.append(new MenuItem({
    label: 'Shiraeeshi',
    submenu: [
      {
        label: 'toggle fullscreen',
        // accelerator: process.platform === 'darwin' ? 'f' : 'f',
        accelerator: shortcutsCfg['toggle-fullscreen'],
        click: (menuItem, win, event) => {
          let nextFullScreen = !win.isFullScreen();
          // let window = electron.remote.getCurrentWindow();
          win.setFullScreen(nextFullScreen);
        }
      },
      {
        label: 'toggle minimal text mode',
        // accelerator: 'm',
        accelerator: shortcutsCfg['toggle-minimal-text-for-timings'],
        click: (menuItem, win, event) => {
          const msg = {
            "type": "run_action",
            "action": "toggle-minimal-text-for-timings"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'toggle underlining the canvas',
        // accelerator: 'Ctrl+L',
        accelerator: shortcutsCfg['toggle-underline-canvas'],
        click: (menuItem, win, event) => {
          const msg = {
            "type": "run_action",
            "action": "toggle-underline-canvas"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'Escape',
        // accelerator: 'Escape',
        accelerator: shortcutsCfg['escape'],
        click: (menuItem, win, event) => {
          if (win.isFullScreen()) {
            win.setFullScreen(false);
          } else {
            win.close();
          }
        }
      },
      {
        label: 'open devtools',
        // accelerator: 'Ctrl+Shift+J',
        accelerator: shortcutsCfg['open-devtools'],
        click: (menuItem, win, event) => {
          win.openDevTools();
        }
      },
      {
        role: 'help',
        accelerator: process.platform === 'darwin' ? 'h' : 'h',
        click: (menuItem, win, event) => {
          console.log('---===[ menu item clicked ]===---')
        }
      }
    ]
  }));
  
  // Menu.setApplicationMenu(null);
  win.setMenu(menu);
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
  const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });
  const config = handleHotkeys(convertConfigFromYamlFormat(YAML.parse(configFileContents)));

  setMenuAndKeyboardShortcuts(win, config);

  const today = new Date();
  const threeDaysAgo = new Date();

  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

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

  let timingsOfThreeLastDays;
  try {
    timingsOfThreeLastDays = await readTimingsForRangeOfDates(config, timing2indexFilename, indexDirFilepath, threeDaysAgo, today);
  } catch (err) {
    func({
      "type": "error_message",
      "source_timing": err.source_timing,
      "source_timing_location": err.source_timing_location,
      "lineNumOffset": err.lineNumOffset,
      "message": err.message
    });
  }

  console.log(`[main.js] timingsOfThreeLastDays: ${JSON.stringify(timingsOfThreeLastDays)}`);

  await func({
    config: config,
    timings: timingsOfThreeLastDays
  });

}

function handleHotkeys(config) {
  inheritDefaultMainMenuShortcuts(config, 'timings_summary_window');
  removeDuplicateShortcutsThatConflictWithMainMenu(config, 'timings_summary_window');
  return config;
}

function inheritDefaultMainMenuShortcuts(config, window_prop_name) {
  if (config.hotkeys === undefined) {
    config.hotkeys = {};
    config.hotkeys.all_windows = {
      shortcuts_of_main_menu: {}
    };
    config.hotkeys[window_prop_name] = {
      shortcuts_of_main_menu: {}
    };
  } else {
    if (config.hotkeys.all_windows === undefined) {
      config.hotkeys.all_windows = {
        shortcuts_of_main_menu: {}
      };
    } else if (config.hotkeys.all_windows.shortcuts_of_main_menu === undefined) {
      config.hotkeys.all_windows.shortcuts_of_main_menu = {};
    }

    if (config.hotkeys[window_prop_name] === undefined) {
      config.hotkeys[window_prop_name] = {
        shortcuts_of_main_menu: {}
      };
    } else if (config.hotkeys[window_prop_name].shortcuts_of_main_menu === undefined) {
      config.hotkeys[window_prop_name].shortcuts_of_main_menu = {};
    }
  }

  for (let [action, shortcut] of Object.entries(config.hotkeys.all_windows.shortcuts_of_main_menu)) {
    if (config.hotkeys[window_prop_name].shortcuts_of_main_menu[action] === undefined) {
      config.hotkeys[window_prop_name].shortcuts_of_main_menu[action] = shortcut;
    }
  }
}

function removeDuplicateShortcutsThatConflictWithMainMenu(config, window_prop_name) {
  if (config.hotkeys === undefined) {
    return config;
  }
  if (config.hotkeys[window_prop_name] === undefined) {
    return config;
  }
  if (config.hotkeys[window_prop_name].shortcuts_of_main_menu === undefined) {
    return config;
  }
  for (let hotkey of Object.values(config.hotkeys[window_prop_name].shortcuts_of_main_menu)) {
    delete config.hotkeys[window_prop_name][hotkey];
    delete config.hotkeys[window_prop_name][hotkey.toUpperCase()];
    delete config.hotkeys[window_prop_name][hotkey.toLowerCase()];
  }
  return config;
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


