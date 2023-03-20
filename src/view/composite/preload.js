const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webkit', {
  messageHandlers: {
    timings_summary_msgs: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_summary_msgs.postMessage');
        ipcRenderer.send('msg_from_timing_summary', msg);
      },
      onMessage: () => {
        // dummy function
      }
    },
    foobar: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.foobar.postMessage');
        ipcRenderer.send('msg_from_notebook', msg);
      },
      onMessage: () => {
        // dummy function
      }
    },
    composite_main_window: {
      onMessage: (callback) => {
        console.log('[preload.js] webkit.messageHandlers.composite_main_window.onMessage');
        ipcRenderer.on('message-from-backend', (_event, msg) => {
          callback(msg);
        });
      },
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.composite_main_window.postMessage');
        ipcRenderer.send('msg', msg);
      },
    },
  }
});
