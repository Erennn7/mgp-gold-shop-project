const { contextBridge, ipcRenderer } = require('electron');

// Helper to clean up IndexedDB if corrupted
const cleanupIndexedDB = () => {
  try {
    // Database names to check
    const dbNames = ['JewelleryShopDB'];
    
    // First check if the database is actually corrupted rather than deleting it right away
    for (const dbName of dbNames) {
      console.log(`Checking IndexedDB database: ${dbName}`);
      
      // Try to open the database first to see if it's functional
      const openRequest = indexedDB.open(dbName);
      
      openRequest.onsuccess = (event) => {
        // Database opened successfully, it's not corrupted
        const db = event.target.result;
        console.log(`Database ${dbName} is functional, version: ${db.version}`);
        db.close();
      };
      
      openRequest.onerror = (event) => {
        // Database failed to open - likely corrupted, try to delete it
        console.error(`Database ${dbName} appears corrupted, attempting to delete:`, event.target.error);
        
        // Create a delete request
        const req = indexedDB.deleteDatabase(dbName);
        
        // Set a timeout to force close any connection that might block deletion
        const timeoutId = setTimeout(() => {
          console.warn(`Deletion of ${dbName} is taking too long, possibly blocked by open connections`);
          // We can't do much more in the preload script to force it
        }, 5000);
        
        req.onsuccess = () => {
          clearTimeout(timeoutId);
          console.log(`Successfully deleted corrupted database: ${dbName}`);
        };
        
        req.onerror = (delEvent) => {
          clearTimeout(timeoutId);
          console.error(`Error deleting database ${dbName}:`, delEvent);
        };
        
        req.onblocked = (blockEvent) => {
          console.warn(`Database deletion blocked for ${dbName}, please close all tabs using this database`);
        };
      };
    }
  } catch (error) {
    console.error('Error in IndexedDB cleanup:', error);
  }
};

// Try to clean corrupted databases on startup
cleanupIndexedDB();

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // File operations
    saveFile: (options) => ipcRenderer.invoke('show-save-dialog', options),
    openFile: (options) => ipcRenderer.invoke('show-open-dialog', options),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', { filePath, data }),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    // MongoDB configuration
    getMongoDBConfig: () => ipcRenderer.invoke('get-mongodb-config'),
    setMongoDBConfig: (config) => ipcRenderer.invoke('set-mongodb-config', config),
    testMongoDBConnection: (uri) => ipcRenderer.invoke('test-mongodb-connection', uri),
    
    // External links
    openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
    
    // Database operations
    cleanIndexedDB: cleanupIndexedDB,
    
    // App events
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', callback);
      return () => ipcRenderer.removeListener('update-available', callback);
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', callback);
      return () => ipcRenderer.removeListener('update-downloaded', callback);
    },
    onUpdaterError: (callback) => {
      ipcRenderer.on('updater-error', callback);
      return () => ipcRenderer.removeListener('updater-error', callback);
    },
    
    // App info
    getAppInfo: () => ({
      version: process.env.npm_package_version || '1.0.0',
      platform: process.platform,
      arch: process.arch
    }),
    
    // System info
    getNetworkInterfaces: () => {
      try {
        return Object.keys(require('os').networkInterfaces())
          .filter(iface => !iface.includes('VMware') && !iface.includes('VirtualBox'));
      } catch (error) {
        console.error('Error getting network interfaces:', error);
        return [];
      }
    }
  }
); 