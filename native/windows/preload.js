/**
 * Renderer ↔ main bridge — exposes hardware capabilities the web app
 * can call via window.debdiNative.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('debdiNative', {
  platform: 'electron-windows',
  printReceipt: (payload) => ipcRenderer.invoke('hw:print-receipt', payload),
  openCashDrawer: () => ipcRenderer.invoke('hw:open-drawer'),
  listSerialPorts: () => ipcRenderer.invoke('hw:list-serial-ports'),
})
