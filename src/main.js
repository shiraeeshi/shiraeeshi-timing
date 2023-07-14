const { app, Tray, nativeImage } = require('electron');
const path = require('path');
const menu = require('./view/menu');
const { TimingTimerManager } = require('./logic/timing_timer_manager.js');

(function preventQuittingWhenWindowAllClosed() {
  app.on('window-all-closed', function() {
    // do nothing
  });
})();

app.whenReady().then(async () => {

  const appEnv = {
    stage: 'production'
  };

  console.log(`[main.js] process.env.APP_ENV: ${process.env.APP_ENV}`);

  if (process.env.APP_ENV === 'development') {
    appEnv.stage = 'development';
  }

  const timerManager = createTimingTimerManager(appEnv);
  await timerManager.init();
  const icon = createIconAccordingToTimerManager(timerManager);
  const tray = new Tray(icon);

  const aMenu = menu.createMenu(appEnv, tray, timerManager);

  tray.setToolTip('This is my application');
  tray.setContextMenu(aMenu);
});

function createIconAccordingToTimerManager(timerManager) {
  const cedarIconDataUrl = require('../icons/cedar-svgrepo-com.png').default;
  const greyCircleIconDataUrl = require('../icons/grey-circle.png').default;
  if (timerManager.hasTiming()) {
    return nativeImage.createFromDataURL(greyCircleIconDataUrl);
  } else {
    return nativeImage.createFromDataURL(cedarIconDataUrl);
  }
}

function createTimingTimerManager(appEnv) {

  let homeDirPath = app.getPath('home');

  let timingFilepath;
  let timingStartFilepath;

  let lastTimingFilepath;
  let lastTimingStartFilepath;

  if (appEnv.stage === 'production') {
    let filesToParseDir = path.join(homeDirPath, 'pm_app', 'files_to_parse');

    timingFilepath = path.join(filesToParseDir, 'timings.txt');
    timingStartFilepath = path.join(filesToParseDir, 'timing_start_datetimes.txt');
    lastTimingFilepath = path.join(filesToParseDir, 'last_timing.txt');
    lastTimingStartFilepath = path.join(filesToParseDir, 'last_timing_start_datetime.txt');
  } else {
    let filesToParseDir = path.join(homeDirPath, 'test_pm_app2', 'files_to_parse');

    timingFilepath = path.join(filesToParseDir, 'timings.txt');
    timingStartFilepath = path.join(filesToParseDir, 'timing_start_datetimes.txt');
    lastTimingFilepath = path.join(filesToParseDir, 'last_timing.txt');
    lastTimingStartFilepath = path.join(filesToParseDir, 'last_timing_start_datetime.txt');
  }

  let timerManager = new TimingTimerManager(timingStartFilepath, timingFilepath, lastTimingStartFilepath, lastTimingFilepath);

  return timerManager;
}
