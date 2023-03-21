const { app, Tray, nativeImage } = require('electron');
const path = require('path');
const menu = require('./view/menu');

let tray;

app.whenReady().then(() => {

  console.log(`process.argv: ${JSON.stringify(process.argv)}`);

  const appEnv = {
    stage: 'development'
  };

  if (app.isPackaged || process.argv[2] === 'stage=prod') {
    appEnv.stage = 'production';
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
