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
        ipcRenderer.send('preferences_msg_choose_file', extractBasename, withRelativePath);
      },
    },
    preferences_msg__choose_directory: {
      postMessage: () => {
        ipcRenderer.send('preferences_msg__choose_directory');
      },
    },
    preferences_msg__filename_exists_in_wallpapers_dir: {
      postMessage: (filename) => {
        ipcRenderer.send('preferences_msg_filename_exists_in_wallpapers_dir', filename);
      }
    },
    preferences_msg__join_dirname_filename: {
      postMessage: (dirName, filename) => {
        ipcRenderer.send('preferences_msg__join_dirname_filename', dirName, filename);
      }
    },
    preferences_msg__mk_filepath_with_expanded_user: {
      postMessage: (filepath) => {
        ipcRenderer.send('preferences_msg__mk_filepath_with_expanded_user', filepath);
      }
    },
    preferences_msg__toggle_fullscreen: {
      postMessage: () => {
        ipcRenderer.send('preferences_msg__toggle_fullscreen');
      }
    },
    preferences_msg__open_devtools: {
      postMessage: () => {
        ipcRenderer.send('preferences_msg__open_devtools');
      }
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
    preferences_msgs__confirm_quit: {
      postMessage: () => {
        ipcRenderer.send('preferences_msgs__confirm_quit');
      }
    },
  }
});

