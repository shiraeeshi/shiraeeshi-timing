const electron = require('electron');
const { app, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const YAML = require('yaml');
const { readTimingsForRangeOfDates } = require('../../logic/timing_file_parser.js');
const { createOrRefreshIndex } = require('../../logic/timing_index_manager.js');
const { parseNotebook } = require('../../logic/notebook_parser.js');

const { showPreferences } = require('../preferences/preferences.js');

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

ipcMain.on('composite_main_window_msgs__disable_shortcuts', async (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.isDisabledShortcuts = true;
});

ipcMain.on('composite_main_window_msgs__enable_shortcuts', async (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.isDisabledShortcuts = false;
});

ipcMain.on('composite_main_window_msgs__show_frequencies_context_menu', async (event, options) => {
  showContextMenuOfProcessTreeNode(event, options);
});

ipcMain.on('composite_main_window_msgs__show_notebook_context_menu', async (event, sourceType, options) => {
  if (sourceType === 'notebook-node') {
    showContextMenuOfNotebookNode(event, options);
  } else if (sourceType === 'tags-tree-node') {
    showContextMenuOfTagsTreeNode(event, options);
  }
});

ipcMain.on('composite_main_window_msgs__show_notebook_container_context_menu', async (event, sourceType, options) => {
  if (sourceType === 'notes-top-panel') {
    showContextMenuOfNotebookNotesTopPanel(event, options);
  }
});

ipcMain.on('composite_main_window_handle_request_for_timings', async (event, commaSeparaDatesWithDotsInThem) => {
  let datesWithDots = commaSeparaDatesWithDotsInThem.split(',');
  let firstDateWithDots = datesWithDots[0];
  let lastDateWithDots = datesWithDots[datesWithDots.length - 1];
  console.log(`[composite_main_window.js] request_timings handler.\n  firstDateWithDots: ${firstDateWithDots}\n  lastDateWithDots: ${lastDateWithDots}`);
  let dateFrom = parseDateWithDots(firstDateWithDots);
  let dateTo = parseDateWithDots(lastDateWithDots);
  let timings;
  try {

    const homeDirPath = app.getPath('home');

    let configFilepath;
    let indexDirFilepath;
    let appEnv = BrowserWindow.fromWebContents(event.sender).appEnv;
    if (appEnv.stage === 'production') {
      configFilepath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'config', 'indic.config.txt');
      indexDirFilepath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'indexes');
    } else {
      configFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'config', 'indic.config.txt');
      indexDirFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'indexes');
    }
    const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });
    const config = convertConfigFromYamlFormat(YAML.parse(configFileContents));

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
    event.sender.send('message-from-backend', msg);
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
  event.sender.send('message-from-backend', msg);
});

ipcMain.on('composite_main_window_msgs__timings_for_period', async (event, periodStr) => {
  let datesWithDots = periodStr.split(' - ');
  if (datesWithDots.length !== 2) {
    throw new Error("composite_main_window_msgs__timings_for_period handler. error: unexpected request parameter value (expected two dates with ' - ' between them)");
  }
  let firstDateWithDots = datesWithDots[0];
  let lastDateWithDots = datesWithDots[1];
  console.log(`[composite_main_window.js] request_timings handler.\n  firstDateWithDots: ${firstDateWithDots}\n  lastDateWithDots: ${lastDateWithDots}`);
  let dateFrom = parseDateWithDots(firstDateWithDots);
  let dateTo = parseDateWithDots(lastDateWithDots);
  let timings;
  try {

    const homeDirPath = app.getPath('home');

    let configFilepath;
    let indexDirFilepath;
    let appEnv = BrowserWindow.fromWebContents(event.sender).appEnv;
    if (appEnv.stage === 'production') {
      configFilepath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'config', 'indic.config.txt');
      indexDirFilepath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'indexes');
    } else {
      configFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'config', 'indic.config.txt');
      indexDirFilepath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'indexes');
    }
    const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });
    const config = convertConfigFromYamlFormat(YAML.parse(configFileContents));

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
  event.sender.send('message-from-backend', msg);
  console.log('[composite_main_window.js] sent timings as a response to frequencies request for period');
});




ipcMain.on('composite_main_window_msgs__confirm_quit', async (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.confirmedQuit = true;
  win.close();
});




export async function showCompositeMainWindow(appEnv) {

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  const win = new BrowserWindow({
    width: 1400,
    height: 1200,
    // frame: false,
    autoHideMenuBar: true,
		webPreferences: {
      preload: path.join(__dirname, 'view/composite/preload.js')
		}
  })
  win.appEnv = appEnv;

  win.loadFile('dist-frontend/composite/composite_main_window.html')

  win.on('close', (event) => {
    if (!win.confirmedQuit) {
      event.preventDefault();
      win.send('message-from-backend', {
        msg_type: 'confirm_quit',
      });
    }
  });

  await init(appEnv, win);
}

function setMenuAndKeyboardShortcuts(appEnv, win, config, configFilepath, indexDirFilepath, messageSender) {

  let isFullScreen = false;
  
  const menu = new Menu();
  menu.append(new MenuItem({
    label: 'Shiraeeshi',
    submenu: [
      {
        label: 'toggle fullscreen',
        accelerator: process.platform === 'darwin' ? 'f' : 'f',
        click: () => {
          if (win.isDisabledShortcuts) {
            return;
          }
          isFullScreen = !isFullScreen;
          // let window = electron.remote.getCurrentWindow();
          win.setFullScreen(isFullScreen);
        }
      },
      {
        label: 'toggle minimal text mode',
        accelerator: 'm',
        click: () => {
          if (win.isDisabledShortcuts) {
            return;
          }
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
          if (win.isDisabledShortcuts) {
            return;
          }
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
          if (win.isDisabledShortcuts) {
            return;
          }
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
          if (win.isDisabledShortcuts) {
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
        label: 'change wallpaper',
        accelerator: 'w',
        click: () => {
          if (win.isDisabledShortcuts) {
            return;
          }
          const msg = {
            "type": "key_pressed",
            "keyval": "w"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'change colors on graph',
        accelerator: 'g',
        click: () => {
          if (win.isDisabledShortcuts) {
            return;
          }
          const msg = {
            "type": "key_pressed",
            "keyval": "g"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'change text color',
        accelerator: 't',
        click: () => {
          if (win.isDisabledShortcuts) {
            return;
          }
          const msg = {
            "type": "key_pressed",
            "keyval": "t"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'change text color of left-side panel',
        accelerator: 'l',
        click: () => {
          if (win.isDisabledShortcuts) {
            return;
          }
          const msg = {
            "type": "key_pressed",
            "keyval": "l"
          };
          win.webContents.send('message-from-backend', msg);
        }
      },
      {
        label: 'change text color of right-side panel',
        accelerator: 'r',
        click: () => {
          if (win.isDisabledShortcuts) {
            return;
          }
          const msg = {
            "type": "key_pressed",
            "keyval": "r"
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
          if (win.isDisabledShortcuts) {
            return;
          }
          console.log('---===[ menu item clicked ]===---')
        }
      },
      {
        role: 'preferences',
        label: 'preferences',
        click: async () => {
          await showPreferences(appEnv)
        }
      },
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
  const config = convertConfigFromYamlFormat(YAML.parse(configFileContents));

  setMenuAndKeyboardShortcuts(appEnv, win, config, configFilepath, indexDirFilepath, messageSender);

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
  let wallpapersConfigPath;
  if (appEnv.stage === 'production') {
    wallpapersDirPath = path.join(homeDirPath, 'pm_app', 'wallpapers');
    wallpapersConfigPath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'config', 'wallpapers.config.yaml');
  } else {
    wallpapersDirPath = path.join(homeDirPath, 'test_pm_app2', 'wallpapers');
    wallpapersConfigPath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'config', 'wallpapers.config.yaml');
  }
  // fs.promises.readdir(wallpapersDirPath, { encoding: 'utf8' })
  //   .then(wallpapersFilenames => {
  //     console.log(`wallpapersFilenames: ${wallpapersFilenames}`);
  //     const pathOfComposite = path.join('dist-frontend', 'composite')
  //     const relativePathToWallpapersDir = path.relative(pathOfComposite, wallpapersDirPath);
  //     console.log(`relativePathToWallpapersDir: ${relativePathToWallpapersDir}`);

  //     let msg = {
  //       "type": "wallpapers",
  //       "wallpapers": wallpapersFilenames.map(n => path.join(relativePathToWallpapersDir, n))
  //     };
  //     func(msg);
  //   });
  Promise.allSettled([
    fs.promises.readdir(wallpapersDirPath, { encoding: 'utf8' }),
    fs.promises.readFile(wallpapersConfigPath, { encoding: 'utf8' })
  ]).then(results => {
    let [wallpapersFilenamesResult, wallpapersConfigResult] = results;

    console.log('[preferences.js] wallpapersFilenamesResult');
    console.dir(wallpapersFilenamesResult);
    console.log('[preferences.js] wallpapersConfigResult');
    console.dir(wallpapersConfigResult);

    if (wallpapersFilenamesResult.status === 'rejected' ||
        wallpapersConfigResult.status === 'rejected') {
      let errors = [];
      if (wallpapersFilenamesResult.status === 'rejected') {
        errors.push('error while scanning wallpapers directory');
      }
      if (wallpapersConfigResult.status === 'rejected') {
        errors.push('error reading wallpapers config');
      }
      func({
        "type": "wallpapers-errors",
        "errors": errors,
      });
      return;
    }
    let wallpapersFilenames = wallpapersFilenamesResult.value;
    let wallpapersConfigFileContents = wallpapersConfigResult.value;
    let wallpapersConfig;
    try {
      wallpapersConfig = YAML.parse(wallpapersConfigFileContents);
    } catch (err) {
      let errors = [];
      errors.push(`error while parsing wallpapers config: "${err.message}"`);
      func({
        "type": "wallpapers-errors",
        "errors": errors,
      });
      return;
    }

    if (wallpapersConfig === null) {
      wallpapersConfig = {};
    }

    console.log(`wallpapersFilenames: ${wallpapersFilenames}`);
    const pathOfPreferences = path.join('dist-frontend', 'preferences')
    const relativePathToWallpapersDir = path.relative(pathOfPreferences, wallpapersDirPath);
    console.log(`relativePathToWallpapersDir: ${relativePathToWallpapersDir}`);

    let msg = {
      "type": "wallpapers",
      "wallpapers": wallpapersFilenames.map(n => {
        let obj = {
          absolutePath: path.join(wallpapersDirPath, n),
          relativePath: path.join(relativePathToWallpapersDir, n),
          basename: n
        };
        obj.filepath = obj.absolutePath;
        return obj;
      }),
      "wallpapersConfig": wallpapersConfig,
    };

    if (!sentConfig) {
      msg.config = config;
      sentConfig = true;
    }

    func(msg);
  });

}

function sendContextMenuCommand(event, command) {
  event.sender.send('message-from-backend', {
    msg_type: 'contextmenu',
    value: command
  });
}

function showContextMenuOfProcessTreeNode(event, options) {
  const listOfMenuItems = [
    {
      label: 'Show this process only',
      click: () => {
        sendContextMenuCommand(event, 'show-this-process-only')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Merge subprocesses',
      enabled: options.canMergeSubprocesses,
      click: () => {
        sendContextMenuCommand(event, 'merge-subprocesses')
      }
    },
    {
      label: 'Unmerge subprocesses of this process',
      enabled: options.hasMergedSubprocesses,
      click: () => {
        sendContextMenuCommand(event, 'unmerge-subprocesses-as-parent')
      }
    },
    {
      label: 'Unmerge subprocesses of ancestor',
      enabled: options.isMergedSubprocess,
      click: () => {
        sendContextMenuCommand(event, 'unmerge-subprocesses-as-subprocess')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Move to top',
      click: () => {
        sendContextMenuCommand(event, 'move-to-top')
      }
    },
    {
      label: 'Move to bottom',
      click: () => {
        sendContextMenuCommand(event, 'move-to-bottom')
      }
    },
    {
      label: 'Hide',
      click: () => {
        sendContextMenuCommand(event, 'hide')
      }
    },
    {
      label: 'Hide siblings below',
      click: () => {
        sendContextMenuCommand(event, 'hide-siblings-below')
      }
    },
    {
      label: 'Unhide hidden children',
      enabled: options.hasHiddenChildren,
      click: () => {
        sendContextMenuCommand(event, 'unhide-hidden-children')
      }
    },
  ];
  const menu = Menu.buildFromTemplate(listOfMenuItems);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
}

function showContextMenuOfNotebookNode(event, options) {
  const listOfMenuItems = [
    {
      label: 'Edit',
      click: () => {
        sendContextMenuCommand(event, 'edit')
      }
    },
    {
      label: 'Add sibling',
      click: () => {
        sendContextMenuCommand(event, 'add-sibling-with-input')
      }
    },
    {
      label: 'Append child',
      click: () => {
        sendContextMenuCommand(event, 'append-child-with-input')
      }
    },
    {
      label: 'Delete',
      click: () => {
        sendContextMenuCommand(event, 'delete')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Cut node',
      click: () => {
        sendContextMenuCommand(event, 'cut-node')
      }
    },
    {
      label: 'Copy node',
      click: () => {
        sendContextMenuCommand(event, 'copy-node')
      }
    },
    {
      label: 'Paste node',
      click: () => {
        sendContextMenuCommand(event, 'paste-node')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Increase font size',
      click: () => {
        sendContextMenuCommand(event, 'increase-font-size')
      }
    },
    {
      label: 'Decrease font size',
      click: () => {
        sendContextMenuCommand(event, 'decrease-font-size')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Move to top',
      click: () => {
        sendContextMenuCommand(event, 'move-to-top')
      }
    },
    {
      label: 'Move to bottom',
      click: () => {
        sendContextMenuCommand(event, 'move-to-bottom')
      }
    },
    {
      label: 'Hide',
      click: () => {
        sendContextMenuCommand(event, 'hide')
      }
    },
    {
      label: 'Hide siblings below',
      click: () => {
        sendContextMenuCommand(event, 'hide-siblings-below')
      }
    },
    {
      label: 'Unhide hidden children',
      enabled: options.hasHiddenChildren,
      click: () => {
        sendContextMenuCommand(event, 'unhide-hidden-children')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Open tag in tags tree',
      enabled: options.isTaggedNode,
      click: () => {
        sendContextMenuCommand(event, 'open-tag-in-tags-tree')
      }
    },
    {
      label: 'Open notes with the same tag in bottom panel',
      enabled: options.isTaggedNode,
      click: () => {
        sendContextMenuCommand(event, 'open-notes-with-the-same-tag-in-bottom-panel')
      }
    },
    {
      label: 'Open tags of children in tags tree',
      enabled: options.hasTaggedChildren,
      click: () => {
        sendContextMenuCommand(event, 'open-tags-of-children-in-tags-tree')
      }
    },
  ];
  if (!options.isTopPanelTree) {
    listOfMenuItems.push({
      type: 'separator'
    });
    listOfMenuItems.push({
      label: 'Open node in top panel',
      click: () => {
        sendContextMenuCommand(event, 'open-node-in-top-panel')
      }
    });
  }
  const menu = Menu.buildFromTemplate(listOfMenuItems);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
}

function showContextMenuOfTagsTreeNode(event, options) {
  let listOfMenuItems = [
    {
      label: 'Copy full path',
      click: () => {
        sendContextMenuCommand(event, 'copy-full-path');
      }
    },
    {
      label: 'Edit full path',
      click: () => {
        sendContextMenuCommand(event, 'edit-full-path');
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Edit',
      click: () => {
        sendContextMenuCommand(event, 'edit')
      }
    },
    {
      label: 'Increase font size',
      click: () => {
        sendContextMenuCommand(event, 'increase-font-size')
      }
    },
    {
      label: 'Decrease font size',
      click: () => {
        sendContextMenuCommand(event, 'decrease-font-size')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Move to top',
      click: () => {
        sendContextMenuCommand(event, 'move-to-top')
      }
    },
    {
      label: 'Move to bottom',
      click: () => {
        sendContextMenuCommand(event, 'move-to-bottom')
      }
    },
    {
      label: 'Hide',
      click: () => {
        sendContextMenuCommand(event, 'hide')
      }
    },
    {
      label: 'Hide siblings below',
      click: () => {
        sendContextMenuCommand(event, 'hide-siblings-below')
      }
    },
    {
      label: 'Unhide hidden children',
      enabled: options.hasHiddenChildren,
      click: () => {
        sendContextMenuCommand(event, 'unhide-hidden-children')
      }
    },
  ];
  if (!options.isTopPanelTree) {
    listOfMenuItems.push({
      type: 'separator'
    });
    listOfMenuItems.push({
      label: 'Open node in top panel',
      click: () => {
        sendContextMenuCommand(event, 'open-node-in-top-panel')
      }
    });
  }
  const menu = Menu.buildFromTemplate(listOfMenuItems);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
}

function showContextMenuOfNotebookNotesTopPanel(event, options) {
  let listOfMenuItems = [
    {
      label: 'Hide tags panel',
      enabled: !options.isHiddenTagsPanel,
      click: () => {
        sendContextMenuCommand(event, 'hide-tags-panel')
      }
    },
    {
      label: 'Show tags panel',
      enabled: options.isHiddenTagsPanel,
      click: () => {
        sendContextMenuCommand(event, 'show-tags-panel')
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
