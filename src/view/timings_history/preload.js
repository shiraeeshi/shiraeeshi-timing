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
    timings_history_latest_msgs: {
      onMessage: (callback) => {
        console.log('[preload.js] webkit.messageHandlers.timings_history_latest_msgs.onMessage');
        ipcRenderer.on('message-from-backend', (_event, msg) => {
          callback(msg);
        });
      },
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_history_latest_msgs.postMessage');
        ipcRenderer.send('msg', msg);
      },
      // request_timings: (dateFrom, dateTo) => {
      //   return ipcRenderer.invoke('request_for_timings', dateFrom, dateTo);
      // },
    },
    history_msg__toggle_fullscreen: {
      postMessage: () => {
        ipcRenderer.send('history_msg__toggle_fullscreen');
      }
    },
    history_msg__open_devtools: {
      postMessage: () => {
        ipcRenderer.send('history_msg__open_devtools');
      }
    },
    timings_history_latest__get_timings: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_history_latest__get_timings.postMessage');
        ipcRenderer.send('timings_history_latest_handle_request_for_timings', msg);
      },
    },
  }
});
