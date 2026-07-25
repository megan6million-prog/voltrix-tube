const { contextBridge } = require('electron')
// Expose nothing sensitive — renderer talks directly to backend via fetch/ws
contextBridge.exposeInMainWorld('voltrix', { platform: 'desktop' })
