const { app, BrowserWindow, ipcMain, screen, globalShortcut, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  // Small square window with the elephant centered. The speech bubble /
  // dialog overlay sits in front of the elephant when shown.
  const windowWidth = 240;
  const windowHeight = 240;
  const x = Math.floor((width - windowWidth) / 2);
  const y = Math.floor((height - windowHeight) / 2);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Click-through by default. Renderer will request to capture mouse events
  // whenever the cursor is over the elephant hitbox or a dialog.
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('move-window', (event, x, y) => {
    if (mainWindow) mainWindow.setPosition(Math.floor(x), Math.floor(y));
  });

  ipcMain.on('set-ignore-mouse', (event, ignore) => {
    if (!mainWindow) return;
    if (ignore) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  });

  ipcMain.on('get-screen-size', (event) => {
    const display = screen.getPrimaryDisplay();
    event.returnValue = {
      width: display.workAreaSize.width,
      height: display.workAreaSize.height,
      winW: windowWidth,
      winH: windowHeight
    };
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    // Background-style app: does not steal focus from the front app.
    app.setActivationPolicy('accessory');
    if (app.dock) app.dock.show();
  }

  // Minimal menu so Cmd+Q still works.
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: 'Quit Tsjaad Olifant', accelerator: 'Cmd+Q', click: () => app.quit() }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  createWindow();
});

app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('will-quit', () => globalShortcut.unregisterAll());
