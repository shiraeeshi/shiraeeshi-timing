const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webkit', {
  messageHandlers: {
    post_timing_dialog_msgs: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.post_timing_dialog_msgs.postMessage');
        ipcRenderer.send('msg', msg);
      },
      onMessage: (callback) => {
        console.log('[preload.js] webkit.messageHandlers.post_timing_dialog_msgs.onMessage');
        ipcRenderer.on('message-from-backend', (_event, msg) => {
          callback(msg);
        });
      }
    },
    timings_frequencies_msgs: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.post_timing_dialog_msgs.postMessage');
        ipcRenderer.send('msg-from-frequencies', msg);
      },
    },
    request_timings_for_period: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.timings_frequencies_msgs.postMessage');
        ipcRenderer.send('post_timing_dialog_msgs__timings_for_period', msg);
      },
    },
    post_timing_dialog_msgs__disable_shortcuts: {
      postMessage: () => {
        ipcRenderer.send('post_timing_dialog_msgs__disable_shortcuts');
      }
    },
    post_timing_dialog_msgs__enable_shortcuts: {
      postMessage: () => {
        ipcRenderer.send('post_timing_dialog_msgs__enable_shortcuts');
      }
    },
    post_timing_dialog_msgs__show_context_menu: {
      postMessage: (options) => {
        ipcRenderer.send('post_timing_dialog_msgs__show_context_menu', options);
      }
    },
    post_timing_dialog_msgs__write_to_clipboard: {
      postMessage: (value) => {
        ipcRenderer.send('post_timing_dialog_msgs__write_to_clipboard', value);
      }
    },
    post_timing_dialog_msgs__write_to_file: {
      postMessage: (filepath, value) => {
        ipcRenderer.send('post_timing_dialog_msgs__write_to_file', filepath, value);
      }
    },
    post_timing_dialog_msgs__cancel: {
      postMessage: () => {
        ipcRenderer.send('post_timing_dialog_msgs__cancel');
      }
    },
    post_timing_dialog_msgs__close: {
      postMessage: () => {
        ipcRenderer.send('post_timing_dialog_msgs__close');
      }
    },
    post_timing_dialog_msgs__close_after_successful_save: {
      postMessage: () => {
        ipcRenderer.send('post_timing_dialog_msgs__close_after_successful_save');
      }
    },
    post_timing_dialog_msgs__confirm_quit: {
      postMessage: () => {
        ipcRenderer.send('post_timing_dialog_msgs__confirm_quit');
      }
    },
  }
});

