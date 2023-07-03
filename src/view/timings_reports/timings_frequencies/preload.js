const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webkit', {
  messageHandlers: {
    timings_frequencies_msgs: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_frequencies_msgs.postMessage');
        ipcRenderer.send('timings_frequencies_msgs', msg);
      },
      onMessage: (callback) => {
        console.log('[preload.js] webkit.messageHandlers.timings_frequencies_msgs.onMessage');
        ipcRenderer.on('message-from-backend', (_event, msg) => {
          callback(msg);
        });
      },
    },
    request_timings_for_period: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_frequencies_msgs.postMessage');
        ipcRenderer.send('timings_frequencies_msgs__timings_for_period', msg);
      },
    },
    show_frequencies_context_menu: {
      postMessage: (options) => {
        ipcRenderer.send('timings_frequencies_msgs__show_context_menu', options);
      }
    },
  }
});

