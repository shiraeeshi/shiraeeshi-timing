const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webkit', {
  messageHandlers: {
    timings_frequencies_msgs: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_frequencies_msgs.postMessage');
        ipcRenderer.send('msg', msg);
      },
      onMessage: (callback) => {
        console.log('[preload.js] webkit.messageHandlers.timings_frequencies_msgs.onMessage');
        ipcRenderer.on('message-from-backend', (_event, msg) => {
          callback(msg);
        });
      },
    },
    timings_frequencies_msgs__timings_for_period: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_frequencies_msgs.postMessage');
        ipcRenderer.send('timings_frequencies_msgs__timings_for_period', msg);
      },
    },
  }
});

