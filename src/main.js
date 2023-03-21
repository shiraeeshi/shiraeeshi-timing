const { app, Tray, nativeImage } = require('electron');
const path = require('path');
const menu = require('./view/menu');

let tray;

app.whenReady().then(() => {

  const appEnv = {
    stage: 'production'
  };

  if (process.env.APP_ENV === 'development') {
    appEnv.stage = 'development';
  }

  const cedarIconDataUrl = require('../icons/cedar-svgrepo-com.png').default;
  const icon = nativeImage.createFromDataURL(cedarIconDataUrl);
  tray = new Tray(icon);

  const aMenu = menu.createMenu(appEnv, tray);

  tray.setToolTip('This is my application');
  tray.setContextMenu(aMenu);
});

function preventQuittingWhenWindowAllClosed() {
  app.on('window-all-closed', function() {
    // do nothing
  });
}

preventQuittingWhenWindowAllClosed();
