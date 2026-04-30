/**
 * Debdi POS — Electron main process.
 *
 * Wraps the deployed Debdi POS web app and exposes hardware bridges
 * (USB printer, serial cash drawer, ESC/POS) to the renderer via a
 * preload script.
 *
 * Configuration:
 *   - DEBDI_URL env var overrides the default https://debdi.uz
 *   - --offline flag loads ./web/index.html (static export)
 */
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const path = require('path')

const DEFAULT_URL = process.env.DEBDI_URL || 'https://debdi.uz'
const OFFLINE = process.argv.includes('--offline')

let mainWindow

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#1c2c4a',
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (OFFLINE) {
    mainWindow.loadFile(path.join(__dirname, 'web', 'index.html'))
  } else {
    mainWindow.loadURL(DEFAULT_URL)
  }

  // Open external links (https://...) in the user's default browser instead
  // of inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Expose a tiny window-level menu (no clutter for cashiers).
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Файл',
        submenu: [
          {
            label: 'Перезагрузить',
            accelerator: 'CmdOrCtrl+R',
            click: () => mainWindow.reload(),
          },
          {
            label: 'Полный экран',
            accelerator: 'F11',
            click: () =>
              mainWindow.setFullScreen(!mainWindow.isFullScreen()),
          },
          { type: 'separator' },
          { label: 'Выйти', role: 'quit' },
        ],
      },
      {
        label: 'Правка',
        submenu: [
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'Помощь',
        submenu: [
          {
            label: 'Сайт debdi.uz',
            click: () => shell.openExternal('https://debdi.uz'),
          },
          {
            label: 'DevTools',
            accelerator: 'CmdOrCtrl+Shift+I',
            click: () => mainWindow.webContents.openDevTools(),
          },
        ],
      },
    ])
  )
}

/* ────────────────────────────────────────────────────────
   Hardware bridges — exposed through ipcMain handlers,
   surfaced to the renderer via preload.js's contextBridge.
   ──────────────────────────────────────────────────────── */
ipcMain.handle('hw:print-receipt', async (_e, payload) => {
  try {
    const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer')
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: payload.interface || 'tcp://192.168.1.100:9100',
      removeSpecialCharacters: false,
      lineCharacter: '-',
    })
    const ok = await printer.isPrinterConnected()
    if (!ok) throw new Error('Принтер не отвечает')
    printer.alignCenter()
    printer.bold(true)
    printer.println(payload.storeName || 'Debdi POS')
    printer.bold(false)
    printer.alignLeft()
    printer.drawLine()
    for (const it of payload.items || []) {
      printer.tableCustom([
        { text: `${it.quantity} × ${it.name}`, align: 'LEFT', width: 0.7 },
        { text: String(it.total), align: 'RIGHT', width: 0.3 },
      ])
    }
    printer.drawLine()
    printer.alignRight()
    printer.bold(true)
    printer.println(`ИТОГО: ${payload.grandTotal}`)
    printer.bold(false)
    printer.cut()
    await printer.execute()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('hw:open-drawer', async () => {
  try {
    const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer')
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: process.env.DEBDI_PRINTER || 'tcp://192.168.1.100:9100',
    })
    printer.openCashDrawer()
    await printer.execute()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('hw:list-serial-ports', async () => {
  try {
    const { SerialPort } = require('serialport')
    const ports = await SerialPort.list()
    return { ok: true, ports }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

app.whenReady().then(createMainWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})
