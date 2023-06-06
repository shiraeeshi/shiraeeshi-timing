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
      postMessage: () => {
        console.log('[preload.js] webkit.messageHandlers.preferences_msg__choose_file.postMessage');
        ipcRenderer.send('msg_choose_file');
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
