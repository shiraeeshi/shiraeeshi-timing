const electron = require('electron');
const { app, dialog, BrowserWindow, ipcMain, Menu, MenuItem, clipboard } = electron;
const path = require('path')
const fs = require('fs');
const YAML = require('yaml');

const { readTimingsForRangeOfDates } = require('../../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../../logic/timing_index_manager.js');
const { expanduser } = require('../../../logic/file_utils.js');

let isDisabledShortcuts = false;
let datetimeKey = '01.01.2023 00:00 - 01:01   (60 m)'

ipcMain.on('msg', (_event, msg) => {
  console.log(`[main.js] message from post_timing_dialog: ${msg}`);
});

ipcMain.on('msg-from-frequencies', (_event, msg) => {
  console.log(`[main.js] message from timings_frequencies: ${msg}`);
});

ipcMain.on('post_timing_dialog_msgs__show_context_menu', async (event, options) => {
  if (options.isRightSideTreeNode) {
    showContextMenuOfRightSideTreeNode(event, options);
  } else {
    showContextMenuOfLeftSideTreeNode(event, options);
  }
});

ipcMain.on('post_timing_dialog_msgs__write_to_clipboard', async (_event, value) => {
  clipboard.writeText(value);
});

ipcMain.on('post_timing_dialog_msgs__cancel', async (event) => {
  // let focusedWindow = BrowserWindow.getFocusedWindow();
  // if (focusedWindow !== null) {
  //   focusedWindow.close();
  //   return;
  // }
  // if (win !== undefined) {
  //   win.close();
  // }
  let window = BrowserWindow.fromWebContents(event.sender);
  window.close();
});

ipcMain.on('post_timing_dialog_msgs__close', async (event) => {
  // let focusedWindow = BrowserWindow.getFocusedWindow();
  // if (focusedWindow !== null) {
  //   focusedWindow.close();
  //   return;
  // }
  // if (win !== undefined) {
  //   win.close();
  // }
  let window = BrowserWindow.fromWebContents(event.sender);
  window.close();
});

ipcMain.on('post_timing_dialog_msgs__write_to_file', async (event, filepath, value) => {
  try {
    console.log('write to file. filepath: ' + filepath);
    console.log('yaml:');
    let valueWithDatetimeKey = {};
    valueWithDatetimeKey[datetimeKey] = value;
    let stringified = YAML.stringify(valueWithDatetimeKey, undefined, {indent: 2, indentSeq: false});
    console.log(stringified);
    const filepathWithExpandedUser = expanduser(filepath);
    await fs.promises.appendFile(filepathWithExpandedUser, stringified);
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

ipcMain.on('post_timing_dialog_msgs__disable_shortcuts', async (_event) => {
  isDisabledShortcuts = true;
});

ipcMain.on('post_timing_dialog_msgs__enable_shortcuts', async (_event) => {
  isDisabledShortcuts = false;
});

ipcMain.on('post_timing_dialog_msgs__timings_for_period', async (event, periodStr) => {
  let datesWithDots = periodStr.split(' - ');
  if (datesWithDots.length !== 2) {
    throw new Error("post_timing_dialog_msgs__timings_for_period handler. error: unexpected request parameter value (expected two dates with ' - ' between them)");
  }
  let firstDateWithDots = datesWithDots[0];
  let lastDateWithDots = datesWithDots[1];
  console.log(`[post_timing_dialog.js] request_timings handler.\n  firstDateWithDots: ${firstDateWithDots}\n  lastDateWithDots: ${lastDateWithDots}`);
  let dateFrom = parseDateWithDots(firstDateWithDots);
  let dateTo = parseDateWithDots(lastDateWithDots);
  let timings;
  try {
    let configFilepath;
    let indexDirFilepath;

    const homeDirPath = app.getPath('home');

    let appEnv = BrowserWindow.fromWebContents(event.sender).appEnv;
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

    let config = convertConfigFromYamlFormat(YAML.parse(configFileContents));

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
    // let win = BrowserWindow.getFocusedWindow();
    // win.webContents.send('message-from-backend', msg);
    event.sender.send('message-from-backend', msg);
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
  // let win = BrowserWindow.getFocusedWindow();
  // win.webContents.send('message-from-backend', msg);
  event.sender.send('message-from-backend', msg);
});

export async function showPostTimingDialog(appEnv, datetimeKeyParam) {
  if (datetimeKeyParam !== undefined) {
    datetimeKey = datetimeKeyParam;
  }

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  let win = new BrowserWindow({
    width: 1000,
    height: 800,
    // frame: false,
    autoHideMenuBar: true,
		webPreferences: {
      preload: path.join(__dirname, 'view/dialogs/post_timing/preload.js')
		}
  })

  win.appEnv = appEnv;
  setMenuAndKeyboardShortcuts(win);

  win.loadFile('dist-frontend/dialogs/post_timing/post_timing_dialog.html')

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

async function init(appEnv, win) {

  let messageSender = new MessageSender(win);

  async function func(msg) {
    await messageSender.send(msg);
  }
  let configFilepath;
  let indexDirFilepath;

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

  let config = convertConfigFromYamlFormat(YAML.parse(configFileContents));

  await func({
    config: config,
  });

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
          if (isDisabledShortcuts) {
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
          if (isDisabledShortcuts) {
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
          if (isDisabledShortcuts) {
            return;
          }
          console.log('---===[ menu item clicked ]===---')
        }
      }
    ]
  }));
  
  Menu.setApplicationMenu(menu);
}

function sendContextMenuCommand(event, command) {
  event.sender.send('message-from-backend', {
    msg_type: 'contextmenu',
    value: command
  });
}

function showContextMenuOfRightSideTreeNode(event, options) {
  const listOfMenuItems = [
    {
      label: 'Edit',
      click: () => {
        sendContextMenuCommand(event, 'right-side-node-edit')
      }
    },
    {
      label: 'Add sibling',
      click: () => {
        sendContextMenuCommand(event, 'right-side-node-add-sibling-with-input')
      }
    },
    {
      label: 'Append child',
      click: () => {
        sendContextMenuCommand(event, 'right-side-node-append-child-with-input')
      }
    },
    {
      label: 'Delete',
      click: () => {
        sendContextMenuCommand(event, 'right-side-node-delete')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Move to top',
      click: () => {
        sendContextMenuCommand(event, 'right-side-node-move-to-top')
      }
    },
    {
      label: 'Move to bottom',
      click: () => {
        sendContextMenuCommand(event, 'right-side-node-move-to-bottom')
      }
    },
  ];
  const menu = Menu.buildFromTemplate(listOfMenuItems);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
}

function showContextMenuOfLeftSideTreeNode(event, options) {
  const listOfMenuItems = [
    {
      label: 'Move to top',
      click: () => {
        sendContextMenuCommand(event, 'left-side-node-move-to-top')
      }
    },
    {
      label: 'Move to bottom',
      click: () => {
        sendContextMenuCommand(event, 'left-side-node-move-to-bottom')
      }
    },
    {
      label: 'Hide',
      click: () => {
        sendContextMenuCommand(event, 'left-side-node-hide')
      }
    },
    {
      label: 'Hide siblings below',
      click: () => {
        sendContextMenuCommand(event, 'left-side-node-hide-siblings-below')
      }
    },
    {
      label: 'Unhide hidden children',
      enabled: options.hasHiddenChildren,
      click: () => {
        sendContextMenuCommand(event, 'left-side-node-unhide-hidden-children')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Copy node to the right side',
      enabled: !options.hasCopyOnTheRightSide,
      click: () => {
        sendContextMenuCommand(event, 'left-side-node-copy-to-the-right-side')
      }
    },
    {
      label: 'Delete corresponding node from the right side',
      enabled: options.hasCopyOnTheRightSide,
      click: () => {
        sendContextMenuCommand(event, 'left-side-node-delete-corresponding-node-from-the-right-side')
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
