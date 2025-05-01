const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const axios = require('axios');
const os = require('os');
const { spawn } = require('child_process');
const https = require('https');

// Setup logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Keep a global reference of the window object
let mainWindow;
let backendProcess = null;
let backendPort = 5001;

// Application data directory for storing config
const appDataPath = path.join(app.getPath('userData'), 'data');
const configFilePath = path.join(appDataPath, 'config.json');
const defaultConfig = {
  backendPort: 5001,
  mongodbUri: process.env.MONGODB_URI || 'mongodb+srv://mg-potdar-user:mg-potdar-password@mg-potdar-cluster.mongodb.net/mg-potdar-jewellers?retryWrites=true&w=majority',
  firstRun: true
};

// Ensure app data directory exists
if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
  log.info('Created app data directory:', appDataPath);
}

// Load or create config file
function loadConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const configData = fs.readFileSync(configFilePath, 'utf8');
      return JSON.parse(configData);
    } else {
      // Create default config file
      fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
  } catch (error) {
    log.error('Error loading config:', error);
    return defaultConfig;
  }
}

// Save config to file
function saveConfig(config) {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    log.error('Error saving config:', error);
    return false;
  }
}

// Clear corrupted IndexedDB
function clearCorruptedIndexedDB() {
  try {
    // This is the directory where Electron stores IndexedDB data
    const userDataPath = app.getPath('userData');
    const indexedDBPath = path.join(userDataPath, 'IndexedDB');
    
    // Check if the directory exists
    if (fs.existsSync(indexedDBPath)) {
      log.info('Checking IndexedDB directory for corruption...');
      
      // Look for the leveldb directory for localhost
      const files = fs.readdirSync(indexedDBPath);
      for (const file of files) {
        if (file.includes('localhost') && file.includes('indexeddb.leveldb')) {
          const dbPath = path.join(indexedDBPath, file);
          
          try {
            // Force delete the entire directory to avoid lock issues
            log.info('Removing IndexedDB database to prevent corruption:', dbPath);
            fs.rmdirSync(dbPath, { recursive: true, force: true });
            log.info('Successfully removed IndexedDB:', dbPath);
          } catch (rmError) {
            log.error('Failed to delete IndexedDB:', rmError);
            
            // On macOS, try using an explicit rm command if rmdirSync fails
            try {
              if (process.platform === 'darwin') {
                const { execSync } = require('child_process');
                execSync(`rm -rf "${dbPath}"`);
                log.info('Successfully removed IndexedDB using shell command:', dbPath);
              }
            } catch (execError) {
              log.error('Failed to delete IndexedDB using shell command:', execError);
            }
          }
        }
      }
    }
  } catch (error) {
    log.error('Error in clearCorruptedIndexedDB:', error);
  }
}

// Start backend server as a child process
function startBackendServer(config) {
  try {
    // Path to the backend directory
    const backendDir = isDev
      ? path.join(process.cwd(), '..', 'backend')
      : path.join(process.resourcesPath, 'app', 'backend');

    log.info('Starting backend server from:', backendDir);
    
    // Create environment variables for the backend
    const env = {
      ...process.env,
      PORT: config.backendPort.toString(),
      MONGODB_URI: config.mongodbUri,
      NODE_ENV: isDev ? 'development' : 'production',
      ELECTRON_RUN: 'true'
    };
    
    // Set executable based on platform
    const nodeBin = process.platform === 'win32' ? 'node.exe' : 'node';
    const nodeExec = isDev 
      ? nodeBin 
      : path.join(process.resourcesPath, 'app', 'node_modules', '.bin', nodeBin);
    
    // Log the command we're about to run
    log.info(`Executing: ${nodeExec} "${path.join(backendDir, 'src', 'index.js')}"`);
    
    // Start the backend process
    backendProcess = spawn(nodeExec, [path.join(backendDir, 'src', 'index.js')], {
      cwd: backendDir,
      env: env,
      windowsHide: true
    });
    
    // Capture backend output for logging
    backendProcess.stdout.on('data', (data) => {
      log.info(`Backend: ${data.toString().trim()}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      log.error(`Backend Error: ${data.toString().trim()}`);
    });
    
    backendProcess.on('close', (code) => {
      log.info(`Backend process exited with code ${code}`);
      if (code !== 0 && !app.isQuitting) {
        // Attempt to restart the backend
        setTimeout(() => {
          log.info('Attempting to restart backend...');
          startBackendServer(config);
        }, 5000);
      }
    });
    
    // Save the port used
    backendPort = config.backendPort;
    
    return true;
  } catch (error) {
    log.error('Error starting backend server:', error);
    return false;
  }
}

// Check if backend is running
async function checkBackendStatus(port) {
  try {
    const url = `http://localhost:${port}/api`;
    const response = await axios.get(url, { timeout: 2000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Wait for backend to be ready
async function waitForBackend(port, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const isRunning = await checkBackendStatus(port);
    if (isRunning) return true;
    
    // Wait 1 second before next attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

function createWindow() {
  // Clear any corrupted IndexedDB data before starting
  clearCorruptedIndexedDB();
  
  // Load configuration
  const config = loadConfig();
  backendPort = config.backendPort;
  
  // Start the backend server
  startBackendServer(config);
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    icon: path.join(__dirname, 'icon.png')
  });

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:* https:;"]
      }
    });
  });

  // Wait for backend to be ready before loading the frontend
  (async () => {
    // Show a loading window or splash screen while waiting for backend
    mainWindow.loadURL(`file://${path.join(__dirname, 'loading.html')}`);
    mainWindow.show();
    
    // Wait for backend to be ready
    const isBackendReady = await waitForBackend(backendPort);
    
    if (!isBackendReady) {
      log.error('Backend server failed to start');
      dialog.showErrorBox(
        'Startup Error',
        'The backend server failed to start. Please check the logs and try restarting the application.'
      );
    }
    
    // Load the app URL
    const startURL = isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../build/index.html')}`;
    
    mainWindow.loadURL(startURL);

    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Check for updates after launch in production
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  })();

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when app is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Set quitting flag to prevent backend restart attempts during app shutdown
app.on('before-quit', () => {
  app.isQuitting = true;
});

// Clean up resources when quitting
app.on('will-quit', () => {
  // Kill the backend process if it's running
  if (backendProcess) {
    try {
      if (process.platform === 'win32') {
        // On Windows, we need to kill the process tree
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        // On macOS and Linux
        backendProcess.kill('SIGKILL');
      }
    } catch (error) {
      log.error('Error killing backend process:', error);
    }
  }
});

// IPC Handlers

// Save file dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, options);
  if (canceled) {
    return { success: false, message: 'Operation canceled by user' };
  }
  return { success: true, filePath };
});

// Open file dialog
ipcMain.handle('show-open-dialog', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, options);
  if (canceled) {
    return { success: false, message: 'Operation canceled by user' };
  }
  return { success: true, filePath: filePaths[0] };
});

// Write file
ipcMain.handle('write-file', async (event, { filePath, data }) => {
  try {
    fs.writeFileSync(filePath, data);
    return { success: true };
  } catch (error) {
    log.error('Error writing file:', error);
    return { success: false, error: error.message };
  }
});

// Read file
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    log.error('Error reading file:', error);
    return { success: false, error: error.message };
  }
});

// Handle MongoDB configuration
ipcMain.handle('get-mongodb-config', async () => {
  const config = loadConfig();
  return {
    uri: config.mongodbUri,
    port: config.backendPort,
    firstRun: config.firstRun
  };
});

ipcMain.handle('set-mongodb-config', async (event, { uri, port }) => {
  try {
    const config = loadConfig();
    
    // Update configuration
    config.mongodbUri = uri;
    if (port && !isNaN(port)) {
      config.backendPort = parseInt(port, 10);
    }
    config.firstRun = false;
    
    // Save the updated config
    saveConfig(config);
    
    // Restart the backend process with new configuration
    if (backendProcess) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        backendProcess.kill('SIGKILL');
      }
      backendProcess = null;
    }
    
    // Start the backend with new config
    startBackendServer(config);
    
    return { success: true };
  } catch (error) {
    log.error('Error setting MongoDB config:', error);
    return { success: false, error: error.message };
  }
});

// External link handler
ipcMain.handle('open-external-url', (event, url) => {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    shell.openExternal(url);
    return true;
  }
  return false;
});

// Test MongoDB connection
ipcMain.handle('test-mongodb-connection', async (event, uri) => {
  try {
    // Use axios to make a test request to our backend with the new URI
    const response = await axios.post(`http://localhost:${backendPort}/api/test-connection`, { uri }, {
      timeout: 10000, // 10 second timeout
      headers: { 'Content-Type': 'application/json' }
    });
    
    return response.data;
  } catch (error) {
    log.error('MongoDB connection test failed:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Connection test failed'
    };
  }
});

// Auto-updater events
autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info);
  mainWindow.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (err) => {
  log.error('AutoUpdater error:', err);
  mainWindow.webContents.send('updater-error', err);
}); 