const electron = require('electron');
const { app, dialog, BrowserWindow, ipcMain, Menu, MenuItem } = electron;
const path = require('path')
const fs = require('fs');
const YAML = require('yaml');

const { forgetLastModifiedTimeOfTimings } = require('../../logic/timing_index_manager.js');

const { expanduser } = require('../../logic/file_utils.js');

ipcMain.on('msg', (_event, msg) => {
  console.log(`[preferences.js] message from preferences: ${msg}`);
});

ipcMain.on('preferences_msg_choose_file', async (event, extractBasename, withRelativePath) => {
  let result = await dialog.showOpenDialog({properties: ['openFile', 'promptToCreate']});
  if (!extractBasename) {
    event.sender.send('message-from-backend', {
      type: 'filepicker_result',
      result: result
    });
    return;
  }
  result.filePaths = result.filePaths.map(fp => {
    let basename = path.basename(fp);

    let obj = {
      filepath: fp,
      basename,
    };
    if (withRelativePath) {
      const pathOfPreferences = path.join('dist-frontend', 'preferences')
      obj.relativePath = path.relative(pathOfPreferences, fp);
    }
    return obj;
  });
  event.sender.send('message-from-backend', {
    type: 'filepicker_result',
    result: result
  });
});

ipcMain.on('preferences_msg__choose_directory', async (event) => {
  let result = await dialog.showOpenDialog({properties: ['openDirectory', 'promptToCreate']});
  event.sender.send('message-from-backend', {
    type: 'directory_picker_result',
    result: result
  });
});

ipcMain.on('preferences_msg_filename_exists_in_wallpapers_dir', async (event, filename) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  let appEnv = win.appEnv;

  const homeDirPath = app.getPath('home');

  let wallpapersDirPath;
  let wallpapersConfigPath;

  if (appEnv.stage === 'production') {
    wallpapersDirPath = path.join(homeDirPath, 'pm_app', 'wallpapers');
  } else {
    wallpapersDirPath = path.join(homeDirPath, 'test_pm_app2', 'wallpapers');
  }

  let filepathToCheck = path.join(wallpapersDirPath, filename);

  let exists = await fs.promises.access(filepathToCheck, fs.constants.F_OK).then(() => true).catch(() => false);

  event.sender.send('message-from-backend', {
    type: 'result_filename_exists_in_wallpapers_dir',
    filename,
    exists,
  });
});

ipcMain.on('preferences_msg__join_dirname_filename', async (event, dirName, filename) => {

  let result = path.join(dirName, filename);

  event.sender.send('message-from-backend', {
    type: 'result_join_dirname_filename',
    result
  });
});

ipcMain.on('preferences_msg__mk_filepath_with_expanded_user', async (event, filepath) => {

  let result = expanduser(filepath);

  event.sender.send('message-from-backend', {
    type: 'result_mk_filepath_with_expanded_user',
    filepath,
    result
  });
});






ipcMain.on('preferences_msg__toggle_fullscreen', (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  if (win.isDisabledShortcuts) {
    return;
  }
  let nextFullScreen = !win.isFullScreen();
  win.setFullScreen(nextFullScreen);
});

ipcMain.on('preferences_msg__open_devtools', (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  if (win.isDisabledShortcuts) {
    return;
  }
  win.openDevTools();
});








ipcMain.on('msg_enable_shortcuts', (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.isDisabledShortcuts = false;
});
ipcMain.on('msg_disable_shortcuts', (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.isDisabledShortcuts = true;
});



ipcMain.on('preferences_msgs__confirm_quit', async (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.confirmedQuit = true;
  win.close();
});

ipcMain.on('msg_cancel', (event) => {
  let win = BrowserWindow.fromWebContents(event.sender);
  win.close();
});

ipcMain.on('msg_save', async (event, msg) => {
  let {
    configWithNoTimings,
    timings,
    timingsToAdd,
    namesOfTimingsToDelete,
    changedTimings,
    changedTimingsConfig,
    changedNotebook,
    wallpapers,
    wallpapersToAdd,
    newNamesOfWallpapersToRenameByOldName,
    namesOfWallpapersToDelete,
  } = msg;
  console.log('SAVE');
  console.dir(msg);

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
    const configFd = await fs.promises.open(configFilepath, 'w');
    let indent = 2;
    let config = createConfigToSave(configWithNoTimings, timings, namesOfTimingsToDelete);
    let data = YAML.stringify(config, indent);
    await fs.promises.writeFile(configFd, data, { encoding: 'utf8' });

    // forgetLastModifiedTimesIfNeeded(timings, timingsToAdd, namesOfTimingsToDelete);
    forgetLastModifiedTimesIfNeeded(timings, indexDirFilepath);

    if (configWithNoTimings.notebook !== undefined) {
      if (configWithNoTimings.notebook.filepath !== undefined) {
        let parentDir = path.dirname(configWithNoTimings.notebook.filepath);
        let parentDirExists = await fs.promises.access(parentDir, fs.constants.F_OK).then(() => true).catch(() => false);
        if (!parentDirExists) {
          await fs.promises.mkdir(parentDir, { recursive: true });
        }
        let exists = await fs.promises.access(configWithNoTimings.notebook.filepath, fs.constants.F_OK).then(() => true).catch(() => false);
        if (!exists) {
          let filehandle = await fs.promises.open(configWithNoTimings.notebook.filepath, 'w');
          await filehandle.close();
        }
      }
    }

    for (let timingToAdd of timingsToAdd) {
      let parentDir = path.dirname(timingToAdd.filepath);
      let parentDirExists = await fs.promises.access(parentDir, fs.constants.F_OK).then(() => true).catch(() => false);
      if (!parentDirExists) {
        await fs.promises.mkdir(parentDir, { recursive: true });
      }
      let exists = await fs.promises.access(timingToAdd.filepath, fs.constants.F_OK).then(() => true).catch(() => false);
      if (!exists) {
        let filehandle = await fs.promises.open(timingToAdd.filepath, 'w');
        await filehandle.close();
      }
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

    await Promise.all(
      namesOfWallpapersToDelete.map(wpToDelete =>
        fs.promises.rm(path.join(wallpapersDirPath, wpToDelete))));

    await Promise.all(
      wallpapersToAdd.map(wpToAdd =>
        fs.promises.cp(wpToAdd.filepath, path.join(wallpapersDirPath, wpToAdd.basename))));

    await Promise.all(
      Object.entries(newNamesOfWallpapersToRenameByOldName).map(([oldName, newName]) => {
        let oldFilepath = path.join(wallpapersDirPath, oldName);
        let newFilepath = path.join(wallpapersDirPath, newName);
        return fs.promises.rename(oldFilepath, newFilepath);
      })
    );

    const wallpapersConfigFd = await fs.promises.open(wallpapersConfigPath, 'w');
    let indentOfWallpapers = 2;
    let nonEmptyWallpapersConfigs = wallpapers.filter(wp => {
      return wp.position !== undefined ||
        wp.leftSideTextColor !== undefined ||
        wp.leftSideIconsColor !== undefined ||
        wp.rightSideTextColor !== undefined ||
        wp.rightSideIconsColor !== undefined;
    });
    let wallpapersConfig = createWallpapersConfigToSave(nonEmptyWallpapersConfigs, namesOfWallpapersToDelete);
    let dataOfWallpapers = YAML.stringify(wallpapersConfig, indentOfWallpapers);
    await fs.promises.writeFile(wallpapersConfigFd, dataOfWallpapers, { encoding: 'utf8' });
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
    return;
  }
});

function createConfigToSave(configWithNoTimings, timings, namesOfTimingsToDelete) {
  namesOfTimingsToDelete = new Set(namesOfTimingsToDelete);
  let resultTimings = copyWithNoAdditionalFields(timings).filter(t => !namesOfTimingsToDelete.has(t.name));
  return Object.assign({}, configWithNoTimings, {timings: resultTimings});
}

function copyWithNoAdditionalFields(timingsFileInfos) {
  return timingsFileInfos.map(t => {
    let copy = Object.assign({}, t);
    delete copy.original;
    if (copy['competitiveness-level'] === 0) {
      delete copy['competitiveness-level'];
    }
    return copy;
  });
}

function createWallpapersConfigToSave(wallpapers, namesOfWallpapersToDelete) {
  namesOfWallpapersToDelete = new Set(namesOfWallpapersToDelete);
  let filtered = wallpapers.filter(wp => !namesOfWallpapersToDelete.has(wp.basename))
  let lst = copyWallpaperInfosWithNoAdditionalFields(filtered);
  let obj = {};
  for (let item of lst) {
    let copy = Object.assign({}, item);
    delete copy.name;
    delete copy.basename;
    obj[item.basename] = copy;
  }
  return obj;
}

function copyWallpaperInfosWithNoAdditionalFields(wallpapers) {
  return wallpapers.map(wp => {
    let copy = Object.assign({}, wp);
    delete copy.filepath;
    delete copy.original;
    return copy;
  });
}

// function createTimingsByNames(timings) {
//   let result = {};
//   for (let t of timings) {
//     result[t.name] = t;
//   }
//   return result;
// }

function forgetLastModifiedTimesIfNeeded(timings, indexDirFilepath) {
  let timingsFilesToUpdate = [];
  // let timingsByNames = createTimingsByNames(timings);
  for (let t of timings) {
    if (t.original !== undefined && t.filepath !== t.original.filepath) {
      timingsFilesToUpdate.push(t.name);
    }
  }
  console.log('[forgetLastModifiedTimesIfNeeded] timingsFilesToUpdate: ');
  console.dir(timingsFilesToUpdate);

  // only delete .last_modified files for timingsFilesToUpdate
  // the rest will be done when refreshing the index
  // ("the rest" means creating new indexes or deleting old unneeded indexes)
  forgetLastModifiedTimeOfTimings(timingsFilesToUpdate, indexDirFilepath);
}

export async function showPreferences(appEnv) {

  await createWindow(appEnv);

}

const createWindow = async (appEnv) => {
  let win = new BrowserWindow({
    width: 1000,
    height: 800,
    // frame: false,
		webPreferences: {
      preload: path.join(__dirname, 'view/preferences/preload.js')
		}
  })
  win.appEnv = appEnv;

  win.loadFile('dist-frontend/preferences/preferences.html')

  win.on('close', (event) => {
    if (!win.confirmedQuit) {
      event.preventDefault();
      win.send('message-from-backend', {
        type: 'confirm_quit',
      });
    }
  });

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

function setMenuAndKeyboardShortcuts(win, config) {

  let shortcutsCfg;

  if (config.hotkeys === undefined) {
    config.hotkeys = {
      preferences_window: {
        shortcuts_of_main_menu: {}
      }
    };
  } else if (config.hotkeys.preferences_window === undefined) {
    config.hotkeys.preferences_window = {
      shortcuts_of_main_menu: {}
    };
  } else if (config.hotkeys.preferences_window.shortcuts_of_main_menu === undefined) {
    config.hotkeys.preferences_window.shortcuts_of_main_menu = {};
  }

  shortcutsCfg = config.hotkeys.preferences_window.shortcuts_of_main_menu;

  const menu = new Menu();
  menu.append(new MenuItem({
    label: 'Shiraeeshi',
    submenu: [
      {
        label: 'toggle fullscreen',
        // accelerator: process.platform === 'darwin' ? 'f' : 'f',
        accelerator: shortcutsCfg['toggle-fullscreen'],
        click: (menuItem, win, event) => {
          if (win.isDisabledShortcuts) {
            return;
          }
          let nextFullScreen = !win.isFullScreen();
          // let window = electron.remote.getCurrentWindow();
          win.setFullScreen(nextFullScreen);
        }
      },
      {
        label: 'Escape',
        // accelerator: 'Escape',
        accelerator: shortcutsCfg['escape'],
        click: (menuItem, win, event) => {
          if (win.isDisabledShortcuts) {
            return;
          }
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
          if (win.isDisabledShortcuts) {
            return;
          }
          win.openDevTools();
        }
      },
      {
        role: 'help',
        accelerator: process.platform === 'darwin' ? 'h' : 'h',
        click: (menuItem, win, event) => {
          if (win.isDisabledShortcuts) {
            return;
          }
          console.log('---===[ menu item clicked ]===---')
        }
      }
    ]
  }));
  
  // Menu.setApplicationMenu(null);
  win.setMenu(menu);
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

  console.log(`[preferences.js] configFilepath: ${configFilepath}`);
  console.log(`[preferences.js] indexDirFilepath: ${indexDirFilepath}`);

  const configFileContents = await fs.promises.readFile(configFilepath, { encoding: 'utf8' });

  const config = handleHotkeys(convertConfigFromYamlFormat(YAML.parse(configFileContents)));
  config.timings.forEach(t => {
    t.filepathWithExpandedUser = expanduser(t.filepath);
  });

  setMenuAndKeyboardShortcuts(win, config);

  await func({
    config: config,
  });

  let wallpapersDirPath;
  let wallpapersConfigPath;
  if (appEnv.stage === 'production') {
    wallpapersDirPath = path.join(homeDirPath, 'pm_app', 'wallpapers');
    wallpapersConfigPath = path.join(homeDirPath, 'pm_app', 'files_to_parse', 'config', 'wallpapers.config.yaml');
  } else {
    wallpapersDirPath = path.join(homeDirPath, 'test_pm_app2', 'wallpapers');
    wallpapersConfigPath = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse', 'config', 'wallpapers.config.yaml');
  }
  console.log(`[preferences.js] wallpapersDirPath: ${wallpapersDirPath}`);
  console.log(`[preferences.js] wallpapersConfigPath: ${wallpapersConfigPath}`);
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
    func(msg);
  });

  // let wallpapersDirPath;
  // if (appEnv.stage === 'production') {
  //   wallpapersDirPath = path.join(homeDirPath, 'pm_app', 'wallpapers');
  // } else {
  //   wallpapersDirPath = path.join(homeDirPath, 'test_pm_app2', 'wallpapers');
  // }
  // const wallpapersFilenames = await fs.promises.readdir(wallpapersDirPath, { encoding: 'utf8' });
  // console.log('[init] 7');
  // console.log(`wallpapersFilenames: ${wallpapersFilenames}`);
  // const relativePathToWallpapersDir = path.relative('dist-frontend', wallpapersDirPath);
  // console.log(`relativePathToWallpapersDir: ${relativePathToWallpapersDir}`);


  // await func({
  //   "type": "wallpapers",
  //   "wallpapers": wallpapersFilenames.map(n => path.join(relativePathToWallpapersDir, n))
  // });
}

function handleHotkeys(config) {
  inheritDefaultMainMenuShortcuts(config, 'preferences_window');
  removeDuplicateShortcutsThatConflictWithMainMenu(config, 'preferences_window');
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
