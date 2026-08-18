const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ecli', {
  getWindowPosition: () => ipcRenderer.invoke('window:get-position'),
  moveWindow: (position) => ipcRenderer.invoke('window:move', position),
  toggleAlwaysOnTop: (value) => ipcRenderer.invoke('window:toggle-always-on-top', value),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  getSystemContext: () => ipcRenderer.invoke('system:get-context'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdaterStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('updater:status', listener);
    return () => ipcRenderer.removeListener('updater:status', listener);
  },
  onEnvironmentActivity: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, activity) => callback(activity);
    ipcRenderer.on('environment:activity', listener);
    return () => ipcRenderer.removeListener('environment:activity', listener);
  },
});
