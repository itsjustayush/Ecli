const { app, BrowserWindow, ipcMain, screen, powerMonitor, nativeTheme } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');

let mainWindow;
let activityTimer;
let updateCheckTimer;
let lastActivitySignature = '';

function sendUpdateStatus(status, payload = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', { status, ...payload });
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    sendUpdateStatus('development');
    return;
  }
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));
  autoUpdater.on('update-available', (info) => sendUpdateStatus('available', { version: info.version }));
  autoUpdater.on('update-not-available', (info) => sendUpdateStatus('current', { version: info.version }));
  autoUpdater.on('download-progress', (progress) => sendUpdateStatus('downloading', { percent: Math.round(progress.percent) }));
  autoUpdater.on('update-downloaded', (info) => sendUpdateStatus('downloaded', { version: info.version }));
  autoUpdater.on('error', (error) => sendUpdateStatus('error', { message: error.message }));
  autoUpdater.checkForUpdates().catch((error) => sendUpdateStatus('error', { message: error.message }));
  updateCheckTimer = setInterval(() => {
    autoUpdater.checkForUpdates().catch((error) => sendUpdateStatus('error', { message: error.message }));
  }, 10 * 60 * 1000);
}


function clampWindowPosition(x, y) {
  const display = screen.getDisplayNearestPoint({ x, y });
  const area = display.workArea;
  const bounds = mainWindow.getBounds();
  return {
    x: Math.max(area.x, Math.min(x, area.x + area.width - bounds.width)),
    y: Math.max(area.y, Math.min(y, area.y + area.height - bounds.height)),
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 410,
    height: 620,
    minWidth: 360,
    minHeight: 520,
    maxWidth: 520,
    maxHeight: 760,
    transparent: true,
    frame: false,
    resizable: true,
    movable: true,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  mainWindow.on('closed', () => {
    clearInterval(activityTimer);
    clearInterval(updateCheckTimer);
    mainWindow = null;
  });

  // Optional local integration protocol. External scripts can write a small JSON file
  // to Ecli’s user-data directory; no screenshots, audio, keystrokes, or page content
  // are collected. See README.md for the format.
  const activityPath = path.join(app.getPath('userData'), 'activity.json');
  activityTimer = setInterval(() => {
    if (!mainWindow || !fs.existsSync(activityPath)) return;
    try {
      const raw = fs.readFileSync(activityPath, 'utf8');
      const activity = JSON.parse(raw);
      const signature = JSON.stringify(activity);
      if (signature !== lastActivitySignature && activity && typeof activity.state === 'string') {
        lastActivitySignature = signature;
        mainWindow.webContents.send('environment:activity', {
          state: activity.state.slice(0, 32),
          label: typeof activity.label === 'string' ? activity.label.slice(0, 80) : '',
        });
      }
    } catch (_) { /* ignore partial or malformed local integration files */ }
  }, 2000);
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) return { status: 'development' };
    try {
      await autoUpdater.checkForUpdates();
      return { status: 'checking' };
    } catch (error) {
      sendUpdateStatus('error', { message: error.message });
      return { status: 'error', message: error.message };
    }
  });
  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) return { status: 'development' };
    try {
      await autoUpdater.downloadUpdate();
      return { status: 'downloading' };
    } catch (error) {
      sendUpdateStatus('error', { message: error.message });
      return { status: 'error', message: error.message };
    }
  });
  ipcMain.handle('updater:install', () => {
    if (app.isPackaged) autoUpdater.quitAndInstall(false, true);
    return { status: 'installing' };
  });

  ipcMain.handle('window:get-position', () => mainWindow?.getPosition() ?? [0, 0]);
  ipcMain.handle('window:move', (_event, { x, y }) => {
    if (!mainWindow || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const point = clampWindowPosition(Math.round(x), Math.round(y));
    mainWindow.setPosition(point.x, point.y, false);
  });
  ipcMain.handle('window:toggle-always-on-top', (_event, value) => {
    if (!mainWindow) return false;
    const enabled = Boolean(value);
    mainWindow.setAlwaysOnTop(enabled, enabled ? 'floating' : 'normal');
    return enabled;
  });
  ipcMain.handle('window:hide', () => mainWindow?.hide());
  ipcMain.handle('system:get-context', () => ({
    onBattery: powerMonitor.isOnBatteryPower(),
    idleSeconds: powerMonitor.getSystemIdleTime(),
    darkMode: nativeTheme.shouldUseDarkColors,
    platform: process.platform,
  }));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
