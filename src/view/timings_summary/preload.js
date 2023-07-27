const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webkit', {
  messageHandlers: {
    timings_summary_msgs: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_summary_msgs.postMessage');
        ipcRenderer.send('msg', msg);
      },
      onMessage: (callback) => {
        console.log('[preload.js] webkit.messageHandlers.timings_summary_msgs.onMessage');
        ipcRenderer.on('message-from-backend', (_event, msg) => {
          callback(msg);
        });
      }
    },
    timings_summary_msgs__toggle_fullscreen: {
      postMessage: () => {
        ipcRenderer.send('timings_summary_msgs__toggle_fullscreen');
      }
    },
    timings_summary_msgs__open_devtools: {
      postMessage: () => {
        ipcRenderer.send('timings_summary_msgs__open_devtools');
      }
    },
  }
});
