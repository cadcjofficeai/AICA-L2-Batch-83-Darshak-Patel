const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { startServer } = require('./dist-server/server.cjs');

let mainWindow = null;
let serverInstance = null;

async function createWindow() {
  const distPath = path.join(__dirname, 'dist');

  try {
    const { server, port, url } = await startServer(0, distPath);
    serverInstance = server;
    console.log(`Backend server successfully started on port ${port}`);

    mainWindow = new BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 1080,
      minHeight: 700,
      title: 'CA Invoice TDS & GST ITC Decision Support System',
      icon: path.join(__dirname, 'build', 'icon.png'),
      backgroundColor: '#0f172a',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
      show: false,
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
      if (targetUrl.startsWith('http:') || targetUrl.startsWith('https:')) {
        shell.openExternal(targetUrl);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });

    Menu.setApplicationMenu(null);

    await mainWindow.loadURL(url);

    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

  } catch (err) {
    console.error('Failed to initialize internal server or window:', err);
    app.quit();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverInstance) {
    try {
      serverInstance.close();
    } catch (e) {
      console.error('Error closing server:', e);
    }
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
