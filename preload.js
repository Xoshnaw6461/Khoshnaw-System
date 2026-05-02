const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
  },
  shell: {
    openExternal: (url) => shell.openExternal(url)
  }
});