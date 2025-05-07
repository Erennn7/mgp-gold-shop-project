import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import Dexie from 'dexie';
import api from '../utils/api';
import { addNetworkStatusListener } from '../utils/networkStatus';

// Database name
const DB_NAME = 'JewelleryShopDB';

// Create a Dexie database
class JewelleryShopDB extends Dexie {
  constructor() {
    super(DB_NAME);
    
    // Define database schema v3 (for backward compatibility)
    this.version(3).stores({
      products: '++id, _id, hoid, name, metalType, purity, weight, _modified, _isNew, _deleted',
      prices: '++id, _id, metalType, purity, effectiveDate, _modified, _isNew, _deleted',
      customers: '++id, _id, name, phone, email, _modified, _isNew, _deleted',
      sales: '++id, _id, invoiceNumber, customer, createdAt, _modified, _isNew, _deleted',
      loans: '++id, _id, customer, loanNumber, startDate, status, _modified, _isNew, _deleted',
      goldPurchases: '++id, _id, referenceNumber, customer, createdAt, _modified, _isNew, _deleted',
      syncQueue: '++id, url, method, data, timestamp, retryCount, entityType, entityId'
    });
    
    // Define database schema v4 with the new weight fields
    this.version(4).stores({
      products: '++id, _id, hoid, name, metalType, purity, netWeight, grossWeight, hasStones, stonePrice, _modified, _isNew, _deleted',
      prices: '++id, _id, metalType, purity, effectiveDate, _modified, _isNew, _deleted',
      customers: '++id, _id, name, phone, email, _modified, _isNew, _deleted',
      sales: '++id, _id, invoiceNumber, customer, createdAt, _modified, _isNew, _deleted',
      loans: '++id, _id, customer, loanNumber, startDate, status, _modified, _isNew, _deleted',
      goldPurchases: '++id, _id, referenceNumber, customer, createdAt, _modified, _isNew, _deleted',
      goldSupplies: '++id, _id, referenceNumber, supplier, createdAt, totalWeight, totalAmount, _modified, _isNew, _deleted',
      syncQueue: '++id, url, method, data, timestamp, retryCount, entityType, entityId'
    }).upgrade(tx => {
      // Migrate weight to netWeight/grossWeight
      return tx.products.toCollection().modify(product => {
        if (product.weight !== undefined && (!product.netWeight || !product.grossWeight)) {
          product.netWeight = product.weight;
          product.grossWeight = product.weight;
          
          // If product has stones, default stonePrice to 0
          if (product.hasStones && product.stonePrice === undefined) {
            product.stonePrice = 0;
          }
        }
      });
    });
    
    // Define database schema v5 with goldSupplies table
    this.version(5).stores({
      products: '++id, _id, hoid, name, metalType, purity, netWeight, grossWeight, hasStones, stonePrice, _modified, _isNew, _deleted',
      prices: '++id, _id, metalType, purity, effectiveDate, _modified, _isNew, _deleted',
      customers: '++id, _id, name, phone, email, _modified, _isNew, _deleted',
      sales: '++id, _id, invoiceNumber, customer, createdAt, _modified, _isNew, _deleted',
      loans: '++id, _id, customer, loanNumber, startDate, status, _modified, _isNew, _deleted',
      goldPurchases: '++id, _id, referenceNumber, customer, createdAt, _modified, _isNew, _deleted',
      goldSupplies: '++id, _id, referenceNumber, supplier, createdAt, totalWeight, totalAmount, _modified, _isNew, _deleted',
      syncQueue: '++id, url, method, data, timestamp, retryCount, entityType, entityId'
    });
    
    // Define tables
    this.products = this.table('products');
    this.prices = this.table('prices');
    this.customers = this.table('customers');
    this.sales = this.table('sales');
    this.loans = this.table('loans');
    this.goldPurchases = this.table('goldPurchases');
    this.goldSupplies = this.table('goldSupplies');
    this.syncQueue = this.table('syncQueue');
    
    // Sync interval in milliseconds
    this.syncInterval = 30000; // 30 seconds
    this.syncIntervalId = null;
  }
  
  // Check if the database is open
  isOpen() {
    try {
      return this._state && this._state.dbOpenError === null && this._state.isBeingOpened === false;
    } catch (e) {
      return false;
    }
  }
  
  // Safe helper to check if a value is a valid IndexedDB key
  isValidKey(value) {
    try {
      // Only certain types can be valid keys
      const type = typeof value;
      
      // Simple check for valid key types
      if (value === undefined || value === null) {
        return false;
      }
      
      if (type === 'number' && !isNaN(value)) {
        return true;
      }
      
      if (type === 'string' && value.length > 0) {
        return true;
      }
      
      if (value instanceof Date && !isNaN(value.getTime())) {
        return true;
      }
      
      if (Array.isArray(value) && value.every(item => this.isValidKey(item))) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking key validity:', error);
      return false;
    }
  }

  // Filter collection safely (alternative to the prototype method approach)
  async safeFilter(tableName, field, value, operator = "equals") {
    try {
      const table = this.table(tableName);
      const allItems = await table.toArray();
      
      // Manual filtering instead of using problematic methods
      return allItems.filter(item => {
        const fieldValue = item[field];
        
        if (operator === "equals") {
          return fieldValue === value;
        } else if (operator === "above") {
          return fieldValue > value;
        } else if (operator === "below") {
          return fieldValue < value;
        } else if (operator === "between" && Array.isArray(value) && value.length === 2) {
          return fieldValue >= value[0] && fieldValue <= value[1];
        }
        
        return false;
      });
    } catch (error) {
      console.error(`Error in safeFilter for ${tableName}.${field}:`, error);
      return [];
    }
  }
  
  // Safe method to query data without using IDBKeyRange
  async safeQuery(tableName, field, value) {
    try {
      const table = this.table(tableName);
      return await table.where(field).equals(value).toArray();
    } catch (error) {
      console.error(`Error in safeQuery for ${tableName}.${field}=${value}:`, error);
      return [];
    }
  }
  
  // Get all records with a filter applied safely
  async getAll(tableName, filterFn = null) {
    try {
      const table = this.table(tableName);
      const allItems = await table.toArray();
      
      if (typeof filterFn === 'function') {
        return allItems.filter(filterFn);
      }
      
      return allItems;
    } catch (error) {
      console.error(`Error in getAll for ${tableName}:`, error);
      return [];
    }
  }
  
  // Get modified items safely
  async getModifiedItems(tableName) {
    return this.getAll(tableName, item => item._modified === true);
  }
  
  // Get deleted items safely
  async getDeletedItems(tableName) {
    return this.getAll(tableName, item => item._deleted === true);
  }
  
  // Get item by _id safely
  async getById(tableName, id) {
    try {
      // Skip validation and just try to handle errors gracefully
      const items = await this.safeQuery(tableName, '_id', id);
      return items.length > 0 ? items[0] : null;
    } catch (error) {
      console.error(`Error getting item by ID (${tableName}, ${id}):`, error);
      return null;
    }
  }
  
  // Start sync scheduler
  setupSyncScheduler() {
    // Clear any existing interval
    this.stopSyncScheduler();
    
    // Set up new interval
    this.syncIntervalId = setInterval(() => {
      if (navigator.onLine) {
        this.sync().catch(error => {
          console.error('Error during scheduled sync:', error);
        });
      }
    }, this.syncInterval);
    
    console.log('Sync scheduler started');
  }
  
  // Stop sync scheduler
  stopSyncScheduler() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('Sync scheduler stopped');
    }
  }
  
  // Helper method to safely query the database with error handling
  async tryQuery(tableName, keyName, keyValue) {
    try {
      // Skip validation and just try to handle errors gracefully
      const table = this.table(tableName);
      return await table.where(keyName).equals(keyValue).first();
    } catch (error) {
      console.error(`Error in tryQuery for ${tableName}.${keyName}=${keyValue}:`, error);
      return null;
    }
  }
  
  // Add a new sync queue item
  async addToSyncQueue(entityType, method, data, entityId = null) {
    const endpoint = `/api/${entityType}`;
    const url = entityId ? `${endpoint}/${entityId}` : endpoint;
    
    return await this.syncQueue.add({
      url,
      method,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      entityType,
      entityId
    });
  }
  
  // Sync local data with server
  async sync() {
    console.log('Starting synchronization...');
    
    try {
      // First check if database is open
      if (!db || !db.isOpen()) {
        console.warn('Cannot sync: database is closed or not initialized');
        return false;
      }

      // Process sync queue (pending requests)
      const queue = await this.syncQueue.toArray();
      
      console.log(`Processing ${queue.length} queued operations`);
      
      for (const item of queue) {
        try {
          // Check again if DB is still open
          if (!db.isOpen()) {
            console.warn('Database closed during sync operation');
            return false;
          }

          // Skip deleted items if they were created offline
          if (item.method === 'DELETE' && item.data?._isNew) {
            console.log(`Skipping DELETE operation for offline-created item`);
            await this.syncQueue.delete(item.id);
            continue;
          }
          
          // Handle different operations
          if (item.method === 'POST') {
            // For new items, we need to create them on the server
            const response = await api.post(item.url, item.data);
            
            if (response.data.success) {
              // Update local item with server-generated ID and remove _isNew flag
              const table = this.table(item.entityType);
              const serverItem = response.data.data;
              
              if (item.data.id) {
                // Update the existing local item with the server data
                await table.update(item.data.id, {
                  _id: serverItem._id,  // Use server-generated MongoDB _id
                  _isNew: false,
                  _modified: false
                });
              }
              
              // Remove from sync queue
              await this.syncQueue.delete(item.id);
            } else {
              // Increment retry count
              item.retryCount = (item.retryCount || 0) + 1;
              
              if (item.retryCount > 5) {
                console.warn(`Too many retries for operation (${item.id}), removing from queue`);
                await this.syncQueue.delete(item.id);
              } else {
                await this.syncQueue.update(item.id, item);
              }
            }
          } else if (item.method === 'PUT') {
            // For updates, send to server
            const response = await api.put(item.url, item.data);
            
            if (response.data.success) {
              // Update local flag
              const table = this.table(item.entityType);
              await table.update(item.data.id, {
                _modified: false
              });
              
              // Remove from sync queue
              await this.syncQueue.delete(item.id);
            } else {
              // Increment retry count
              item.retryCount = (item.retryCount || 0) + 1;
              
              if (item.retryCount > 5) {
                await this.syncQueue.delete(item.id);
              } else {
                await this.syncQueue.update(item.id, item);
              }
            }
          } else if (item.method === 'DELETE') {
            // For deleted items
            const response = await api.delete(item.url);
            
            if (response.data && response.data.success) {
              // Remove from local database
              const table = this.table(item.entityType);
              const localItems = await this.safeQuery(item.entityType, '_id', item.entityId);
              
              if (localItems.length > 0) {
                // Use the local ID (primary key) for deletion
                await table.delete(localItems[0].id);
              }
              
              // Remove from sync queue
              await this.syncQueue.delete(item.id);
            } else {
              // Increment retry count
              item.retryCount = (item.retryCount || 0) + 1;
              
              if (item.retryCount > 5) {
                await this.syncQueue.delete(item.id);
              } else {
                await this.syncQueue.update(item.id, item);
              }
            }
          }
        } catch (opError) {
          console.error(`Error processing sync queue item ${item.id}:`, opError);
          
          // Increment retry count
          item.retryCount = (item.retryCount || 0) + 1;
          
          if (item.retryCount > 5) {
            console.warn(`Removing failed operation from queue after ${item.retryCount} retries`);
            await this.syncQueue.delete(item.id);
          } else {
            await this.syncQueue.update(item.id, item);
          }
        }
      }
      
      // Pull updated data from the server
      const tables = [
        { name: 'products', endpoint: '/api/products' },
        { name: 'prices', endpoint: '/api/prices' },
        { name: 'customers', endpoint: '/api/customers' },
        { name: 'sales', endpoint: '/api/sales' },
        { name: 'loans', endpoint: '/api/loans' }
      ];
      
      // Pull data from each table if we're online
      if (navigator.onLine) {
        for (const table of tables) {
          try {
            await this.pullFromServer(table.name, table.endpoint);
          } catch (pullError) {
            console.error(`Error syncing ${table.name} from server:`, pullError);
            // Continue with next table
          }
        }
      }
      
      console.log('Synchronization completed successfully');
      return true;
    } catch (error) {
      console.error('Error during synchronization:', error);
      throw error;
    }
  }
  
  // Pull data from server and merge with local changes - completely rewritten to avoid IDBKeyRange issues
  async pullFromServer(tableName, endpoint) {
    try {
      // Check if database is still open
      if (!this.isOpen()) {
        console.warn(`Cannot pull from server: database closed`);
        return;
      }
      
      // Get data from server
      const response = await api.get(endpoint);
      
      if (!response.data || !response.data.success) {
        console.warn(`API response for ${tableName} was not successful`);
        return;
      }
      
      const serverItems = response.data.data;
      if (!serverItems || !Array.isArray(serverItems)) {
        console.warn(`No valid data returned for ${tableName}`);
        return;
      }
      
      try {
        // Check again if database is still open
        if (!this.isOpen()) {
          console.warn(`Database closed during pullFromServer operation`);
          return;
        }
        
        // Get table reference
        const table = this.table(tableName);
        
        // Fetch all existing items
        const localItems = await table.toArray();
        
        // Create a map of local items with _id as key
        const localItemMap = {};
        for (const item of localItems) {
          if (item._id) {
            localItemMap[item._id] = item;
          }
        }
        
        // Process server items
        const transactions = [];
        
        for (const serverItem of serverItems) {
          try {
            // Check if we have a valid _id
            if (!serverItem._id) {
              console.warn(`Server item without _id in ${tableName}, skipping:`, serverItem);
              continue;
            }
            
            const localItem = localItemMap[serverItem._id];
            
            // If item doesn't exist locally or hasn't been modified locally, add/update it
            if (!localItem) {
              // New item from server
              transactions.push({
                type: 'add',
                item: { 
                  ...serverItem, 
                  _modified: false,
                  _isNew: false,
                  _deleted: false
                }
              });
            } else if (!localItem._modified) {
              // Update non-modified local item with server data
              transactions.push({
                type: 'update',
                item: { 
                  ...localItem,
                  ...serverItem,
                  id: localItem.id, // Keep the local PK
                  _modified: false,
                  _isNew: false,
                  _deleted: false
                }
              });
            }
            // Skip modified local items - they will be synced to server later
          } catch (itemError) {
            console.error(`Error processing server item in ${tableName}:`, itemError, serverItem);
          }
        }
        
        // Execute all transactions
        if (transactions.length > 0) {
          await table.bulkPut(
            transactions
              .filter(t => t.type === 'add' || t.type === 'update')
              .map(t => t.item)
          );
          console.log(`Synced ${transactions.length} items from server to ${tableName}`);
        } else {
          console.log(`No items to sync from server to ${tableName}`);
        }
        
      } catch (dbError) {
        console.error(`Error accessing table ${tableName}:`, dbError);
        throw dbError;
      }
    } catch (error) {
      console.error(`Error working with ${tableName} table:`, error);
      throw error;
    }
  }
}

// Function to clear all tables in the database
const clearAllTables = async (dbInstance) => {
  // Get all tables
  const tables = dbInstance.tables.map(table => table.name);
  
  console.log('Clearing all tables:', tables);
  
  // Clear each table one by one
  for (const tableName of tables) {
    try {
      await dbInstance.table(tableName).clear();
      console.log(`Table ${tableName} cleared successfully`);
    } catch (error) {
      console.error(`Error clearing table ${tableName}:`, error);
      // Continue with other tables
    }
  }
};

// Alternative way to delete database - more aggressive
const forceDeleteDatabase = async (dbName = DB_NAME) => {
  return new Promise((resolve) => {
    console.log(`Forcing deletion of IndexedDB database: ${dbName}`);
    
    // Try the standard way first
    const request = window.indexedDB.deleteDatabase(dbName);
    
    // Set a timeout in case the standard way gets stuck
    const timeoutId = setTimeout(() => {
      console.warn('Standard deletion timed out, trying alternative approach');
      
      // Try to open the database with a higher version number
      try {
        const openRequest = window.indexedDB.open(dbName, 9999);
        
        openRequest.onupgradeneeded = function(event) {
          const db = event.target.result;
          
          // Get all existing object stores and delete them
          const objectStoreNames = Array.from(db.objectStoreNames);
          objectStoreNames.forEach(storeName => {
            try {
              db.deleteObjectStore(storeName);
            } catch (e) {
              console.error(`Error deleting store ${storeName}:`, e);
            }
          });
          
          console.log('Cleared all object stores in the database');
        };
        
        openRequest.onsuccess = function(event) {
          const db = event.target.result;
          db.close();
          console.log('Force deletion successful');
          resolve(true);
        };
        
        openRequest.onerror = function(event) {
          console.error('Error in force deletion:', event);
          resolve(false);
        };
      } catch (e) {
        console.error('Exception during force deletion:', e);
        resolve(false);
      }
    }, 2000);
    
    request.onsuccess = function() {
      clearTimeout(timeoutId);
      console.log('Standard deletion succeeded');
      resolve(true);
    };
    
    request.onerror = function(event) {
      console.error('Standard deletion failed:', event);
      // Let the timeout handler try the alternative approach
    };
  });
};

// Create context
const DatabaseContext = createContext({
  db: null,
  isLoading: true,
  error: null,
  isOnline: navigator.onLine,
  lastSyncTime: null,
  initialize: () => Promise.resolve(),
  forceSync: () => Promise.resolve(false)
});

// Create global instance
let db = null;

// Provider component
export const DatabaseProvider = ({ children }) => {
  const [db, setDb] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Initialize database
  useEffect(() => {
    const initDatabase = async () => {
        try {
        console.log('Initializing database');
        
        // Check if database already exists first
        if (window.indexedDB) {
          try {
            // List all databases (only works in modern browsers)
            if ('databases' in window.indexedDB) {
              const databases = await window.indexedDB.databases();
              const dbExists = databases.some(db => db.name === DB_NAME);
              console.log(`Database ${DB_NAME} exists: ${dbExists}`);
            }
              } catch (err) {
            console.warn('Could not check existing databases:', err);
          }
        }
        
        // Create database with error handling
        let database = null;
        try {
          database = new JewelleryShopDB();
          await database.open();
          console.log('Database opened successfully with version:', database.verno);
        } catch (dbError) {
          console.error('Error opening database:', dbError);
          
          // Try to recover by forcing a new connection
          if (!database || !database.isOpen()) {
            console.warn('Database failed to open, attempting to create a new connection');
            try {
              // If the first attempt failed, we might need to force a new connection
              if (database) {
            try {
                  database.close();
                } catch (e) {
                  // Ignore errors in closing
                }
          }
          
              // Create a new database instance
              database = new JewelleryShopDB();
              await database.open();
              console.log('Database opened on second attempt with version:', database.verno);
            } catch (secondError) {
              console.error('Fatal error opening database on second attempt:', secondError);
              setError(secondError);
              setIsLoading(false);
              return;
            }
          }
        }
        
        setDb(database);
        
        // Set up online/offline event listeners
        window.addEventListener('online', handleConnectionChange);
        window.addEventListener('offline', handleConnectionChange);
        
        setIsLoading(false);
      
        // Initial sync if online
        if (navigator.onLine) {
          console.log('Connected to network, performing initial sync');
          try {
            await performFullSync(database);
            setLastSyncTime(new Date());
          } catch (syncError) {
            console.error('Initial sync error:', syncError);
      }
        } else {
          console.log('Offline mode: using local data only');
      }
      } catch (initError) {
        console.error('Error initializing database:', initError);
        setError(initError);
        setIsLoading(false);
      }
    };
    
    initDatabase();
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, []);

  // Handle online/offline status changes
  const handleConnectionChange = async (event) => {
    const online = event.type === 'online';
    console.log(`Connection status changed: ${online ? 'online' : 'offline'}`);
    setIsOnline(online);
    
    if (online && db) {
      // When coming back online, sync data
      try {
        await performFullSync(db);
        setLastSyncTime(new Date());

        // Show notification that data is synced
        // (You could add a toast notification here)
      } catch (syncError) {
        console.error('Error syncing data after reconnection:', syncError);
    }
    }
  };
  
  // Periodic sync when online (every 5 minutes)
  useEffect(() => {
    let syncInterval;
      
    if (isOnline && db) {
      syncInterval = setInterval(async () => {
        try {
          await performFullSync(db);
          setLastSyncTime(new Date());
          console.log('Periodic sync completed at', new Date().toLocaleTimeString());
        } catch (error) {
          console.error('Error during periodic sync:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [isOnline, db]);
  
  const contextValue = {
    db,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    initialize: async () => {
      // Since the database is already initialized in the useEffect when the provider mounts,
      // this is just a helper method that returns a promise that resolves when db is ready
      if (db && !isLoading) {
        return Promise.resolve(db);
      }
      
      // Return a promise that resolves when the database becomes available
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (db && !isLoading) {
            clearInterval(checkInterval);
            resolve(db);
          }
        }, 100);
      });
    },
    forceSync: async () => {
      if (db && isOnline) {
        try {
          await performFullSync(db);
          setLastSyncTime(new Date());
          return true;
        } catch (error) {
          console.error('Force sync error:', error);
          return false;
        }
      }
      return false;
    }
  };

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
};

// Custom hook to use the database context
export const useDatabase = () => useContext(DatabaseContext);

export default DatabaseContext; 

// Add a function to perform a full sync of data when online
const performFullSync = async (db) => {
  try {
    console.log('Performing full data sync');
    
    // Define collections to sync
    const collections = [
      { name: 'customers', endpoint: '/api/customers' },
      { name: 'products', endpoint: '/api/products' },
      { name: 'sales', endpoint: '/api/sales' },
      { name: 'prices', endpoint: '/api/prices?metalType=gold' },
      { name: 'prices', endpoint: '/api/prices?metalType=silver', params: { metalType: 'silver' } },
      { name: 'goldPurchases', endpoint: '/api/gold-purchases' },
      { name: 'goldSupplies', endpoint: '/api/gold-supplies' }
    ];

    // Fetch and store data for each collection
    for (const collection of collections) {
      try {
        const response = await api.get(collection.endpoint);
        if (response.data.success) {
          const items = response.data.data || [];
          
          // Store in IndexedDB
          if (items.length > 0) {
            console.log(`Syncing ${items.length} items to ${collection.name}`);
            
            // Clear existing data if this is a full refresh
            if (!collection.params) {
              await db[collection.name].clear();
            }
            
            // Add items with specific filtering if params exist
            if (collection.params) {
              // For collections like prices that need filtering
              const filteredItems = items.filter(item => 
                Object.entries(collection.params).every(([key, value]) => 
                  item[key] === value
                )
              );
              await db[collection.name].bulkPut(filteredItems);
            } else {
              // Regular collections
              await db[collection.name].bulkPut(items);
            }
          }
        }
      } catch (error) {
        console.error(`Error syncing ${collection.name}:`, error);
      }
    }
    
    console.log('Full sync completed');
    return true;
  } catch (error) {
    console.error('Error during full sync:', error);
    return false;
  }
};