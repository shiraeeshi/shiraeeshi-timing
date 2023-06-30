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
    timings_history_latest_msgs: {
      onMessage: (callback) => {
        console.log('[preload.js] webkit.messageHandlers.timings_history_latest_msgs.onMessage');
        ipcRenderer.on('message-from-backend', (_event, msg) => {
          callback(msg);
        });
      },
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_history_latest_msgs.postMessage');
        ipcRenderer.send('msg_from_history', msg);
      },
      // request_timings: (dateFrom, dateTo) => {
      //   return ipcRenderer.invoke('request_for_timings', dateFrom, dateTo);
      // },
    },
    timings_history_latest__get_timings: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_history_latest__get_timings.postMessage');
        ipcRenderer.send('request_for_timings', msg);
      },
    },
    composite_main_window_msgs__timings_for_period: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_frequencies_msgs.postMessage');
        ipcRenderer.send('composite_main_window_msgs__timings_for_period', msg);
      },
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
