const { app, nativeImage, Menu, MenuItem, BrowserWindow } = require('electron');
const path = require('path');
const { showTimingsSummary } = require('./timings_summary/summary.js');
const { showHistoryLatest } = require('./timings_history/history_latest.js');
const { showFrequencies } = require('./timings_reports/timings_frequencies/timings_frequencies.js');
const { showNotebook } = require('./notebook/notebook.js');
const { showCompositeMainWindow } = require('./composite/composite_main_window.js');
const { showPreferences } = require('./preferences/preferences.js');
const { showPostTimingDialog } = require('./dialogs/post_timing/post_timing_dialog.js');
const { TimingTimerManager } = require('../logic/timing_timer_manager.js');

export function createMenu(appEnv, tray) {

  let homeDirPath = app.getPath('home');
  let timingStartFilepath = path.join(homeDirPath, 'timing_start');
  let timingFilepath = path.join(homeDirPath, 'testtiming');

  let timerManager = new TimingTimerManager(timingStartFilepath, timingFilepath);

  let menu;
  menu = Menu.buildFromTemplate([
    {
      label: 'Start Timing',
      click: async () => {
        let timingName = 'test timing';
        await timerManager.startTiming(timingName);
        const greyCircleIconDataUrl = require('../../icons/grey-circle.png').default;
        const icon = nativeImage.createFromDataURL(greyCircleIconDataUrl);
        tray.setImage(icon);
        tray.setContextMenu(createSecondMenu(appEnv, menu, tray, timerManager));
      }
    },
    {
      label: 'Main Window',
      click: async () => {
        await showCompositeMainWindow(appEnv);
      }
    },
    {
      label: 'Notebook',
      click: async () => {
        await showNotebook(appEnv);
      }
    },
    {
      label: 'Timings Frequencies',
      click: async () => {
        await showFrequencies(appEnv);
      }
    },
    {
      label: 'Timings History Latest',
      click: async () => {
        await showHistoryLatest(appEnv);
      }
    },
    {
      label: 'Timings Summary',
      click: async () => {
        await showTimingsSummary(appEnv);
      }
    },
    {
      label: 'Preferences',
      click: async () => {
        await showPreferences(appEnv);
      }
    },
    {
      label: 'Post-Timing Dialog',
      click: async () => {
        await showPostTimingDialog(appEnv);
      }
    },
    {
      label: 'quit',
      click: () => {
        app.exit();
      }
    }
  ]);

  return menu;
}

function createSecondMenu(appEnv, firstMenu, tray, timerManager) {

  const secondMenu = Menu.buildFromTemplate([
    {
      label: 'Stop Timing',
      click: async () => {
        let datetimeKey = await timerManager.stopTiming();
        const iconDataUrl = require('../../icons/cedar-svgrepo-com.png').default;
        const icon = nativeImage.createFromDataURL(iconDataUrl);
        tray.setImage(icon);
        tray.setContextMenu(firstMenu);
        await showPostTimingDialog(appEnv, datetimeKey);
      }
    },
    {
      label: '>',
      submenu: [
        {
          label: 'Main Window',
          click: async () => {
            await showCompositeMainWindow(appEnv);
          }
        },
        {
          label: 'Notebook',
          click: async () => {
            await showNotebook(appEnv);
          }
        },
        {
          label: 'Timings Frequencies',
          click: async () => {
            await showFrequencies(appEnv);
          }
        },
        {
          label: 'Timings History Latest',
          click: async () => {
            await showHistoryLatest(appEnv);
          }
        },
        {
          label: 'Timings Summary',
          click: async () => {
            await showTimingsSummary(appEnv);
          }
        },
        {
          label: 'Preferences',
          click: async () => {
            await showPreferences(appEnv);
          }
        },
        {
          label: 'Post-Timing Dialog',
          click: async () => {
            await showPostTimingDialog(appEnv);
          }
        },
        {
          label: 'quit',
          click: () => {
            app.exit();
          }
        }
      ]
    },
  ]);

  return secondMenu;
}
