const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webkit', {
  messageHandlers: {
    preferences_msgs: {
      postMessage: (msg) => {
        console.log('[preload.js] webkit.messageHandlers.preferences_msgs.postMessage');
        ipcRenderer.send('msg', msg);
      },
      onMessage: (callback) => {
        console.log('[preload.js] webkit.messageHandlers.preferences_msgs.onMessage');
        ipcRenderer.on('message-from-backend', (_event, msg) => {
          callback(msg);
        });
      }
    },
    preferences_msg__choose_file: {
      postMessage: (extractBasename, withRelativePath) => {
        console.log('[preload.js] webkit.messageHandlers.preferences_msg__choose_file.postMessage');
        ipcRenderer.send('msg_choose_file', extractBasename, withRelativePath);
      },
    },
    preferences_msg__enable_shortcuts: {
      postMessage: () => {
        console.log('[preload.js] webkit.messageHandlers.preferences_msg__enable_shortcuts.postMessage');
        ipcRenderer.send('msg_enable_shortcuts');
      },
    },
    preferences_msg__disable_shortcuts: {
      postMessage: () => {
        console.log('[preload.js] webkit.messageHandlers.preferences_msg__disable_shortcuts.postMessage');
        ipcRenderer.send('msg_disable_shortcuts');
      },
    },
    preferences_msg__cancel: {
      postMessage: () => {
        ipcRenderer.send('msg_cancel');
      }
    },
    preferences_msg__save: {
      postMessage: (msg) => {
        ipcRenderer.send('msg_save', msg);
      }
    },
  }
});

