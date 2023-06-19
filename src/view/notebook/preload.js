const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webkit', {
  messageHandlers: {
    foobar: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.foobar.postMessage');
        ipcRenderer.send('msg', msg);
      },
      onMessage: (callback) => {
        console.log('[preload.js] webkit.messageHandlers.foobar.onMessage');
        ipcRenderer.on('message-from-backend', (_event, msg) => {
          callback(msg);
        });
      },
    },
    notebook_msgs__disable_shortcuts: {
      postMessage: () => {
        ipcRenderer.send('notebook_msgs__disable_shortcuts');
      }
    },
    notebook_msgs__enable_shortcuts: {
      postMessage: () => {
        ipcRenderer.send('notebook_msgs__enable_shortcuts');
      }
    },
  }
});


