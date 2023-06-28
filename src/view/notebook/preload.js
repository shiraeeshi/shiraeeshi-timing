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
    notebook_msgs__show_context_menu: {
      postMessage: (sourceType, options) => {
        ipcRenderer.send('notebook_msgs__show_context_menu', sourceType, options);
      }
    },
    notebook_msgs__copy_full_path_of_tag: {
      postMessage: (fullPathStr) => {
        ipcRenderer.send('notebook_msgs__copy_full_path_of_tag', fullPathStr);
      }
    },
    notebook_msgs__save_notebook: {
      postMessage: (preYamlJson, filepath) => {
        ipcRenderer.send('notebook_msgs__save_notebook', preYamlJson, filepath);
      }
    },
  }
});


