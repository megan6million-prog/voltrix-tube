const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const { fork } = require('child_process')
const { autoUpdater } = require('electron-updater')

let mainWindow, tray, workerProcess

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    },
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, 'assets/icon.png')
  })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  mainWindow.on('close', e => {
    e.preventDefault()
    mainWindow.hide()
  })
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets/icon.png'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Voltrix — Earning')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: () => mainWindow.show() },
    { label: 'Quit', click: () => { app.exit(0) } }
  ]))
  tray.on('click', () => mainWindow.show())
}

function startWorker() {
  const workerPath = path.join(__dirname, 'worker/index.js')
  workerProcess = fork(workerPath, [], { silent: true })
  workerProcess.on('exit', () => setTimeout(startWorker, 5000)) // auto-restart
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  startWorker()

  // Silent auto-update check
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify()
    setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 1000 * 60 * 60) // every hour
  }
})

app.on('window-all-closed', e => e.preventDefault())
