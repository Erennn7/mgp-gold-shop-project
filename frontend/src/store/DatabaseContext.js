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
    
    // Define database schema with enhanced tracking fields
    this.version(2).stores({
      products: '++id, _id, hoid, name, metalType, purity, weight, _modified, _isNew, _deleted',
      prices: '++id, _id, metalType, purity, effectiveDate, _modified, _isNew, _deleted',
      customers: '++id, _id, name, phone, email, _modified, _isNew, _deleted',
      purchases: '++id, _id, invoiceNumber, customer, createdAt, _modified, _isNew, _deleted',
      loans: '++id, _id, customer, loanNumber, startDate, status, _modified, _isNew, _deleted',
      syncQueue: '++id, url, method, data, timestamp, retryCount, entityType, entityId'
    });
    
    // Define tables
    this.products = this.table('products');
    this.prices = this.table('prices');
    this.customers = this.table('customers');
    this.purchases = this.table('purchases');
    this.loans = this.table('loans');
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
    if (!this.isValidKey(value)) {
      console.warn(`Invalid key detected for field ${field}: `, value);
      return [];
    }
    
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
    if (!this.isValidKey(id)) {
      console.warn(`Invalid ID for ${tableName}: ${id}`);
      return null;
    }
    
    try {
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
      if (!this.isValidKey(keyValue)) {
        console.warn(`Skipping query with invalid key ${keyValue} for ${tableName}.${keyName}`);
        return null;
      }
      
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
        { name: 'purchases', endpoint: '/api/purchases' },
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
  isInitialized: false,
  isOnline: navigator.onLine,
  initialize: () => {},
  sync: () => {},
  resetDatabase: () => {},
  pendingSyncCount: 0
});

// Create global instance
let db = null;

// Provider component
export const DatabaseProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [hasErrors, setHasErrors] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Add sync lock
  
  // Forward declaration to avoid initialization error
  let initialize;
  
  // Initialize database - defining this function first
  initialize = useCallback(async () => {
    try {
      if (!db) {
        try {
          console.log('Creating new database instance');
          db = new JewelleryShopDB();
          
          // Try to open database with timeout protection
          let dbOpenPromise = db.open();
          
          // Set a timeout to detect if the open operation is stuck
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Database open operation timed out after 5 seconds'));
            }, 5000);
          });
          
          // Wait for either the open operation to complete or timeout
          await Promise.race([dbOpenPromise, timeoutPromise])
            .catch(async error => {
              console.error('Error opening database:', error);
              
              // If open times out or fails, try to force reset
              if (db) {
                try {
                  db.close();
                } catch (e) {
                  // Ignore close errors
                }
              }
              
              // Force delete the database
              await forceDeleteDatabase();
              
              // Create a new instance
              db = new JewelleryShopDB();
              
              // Try to open again
              await db.open();
            });
          
          // Test basic operations
          try {
            console.log('Testing basic database operations');
            await db.products.count();
            console.log('Database initialized successfully');
          } catch (opError) {
            console.error('Database operation test failed, will reset database:', opError);
            
            // Do a direct reset instead of calling resetDatabase to avoid circular dependency
            // Close and delete the database
            if (db) {
              try {
                db.close();
              } catch (err) {
                // Ignore close errors
              }
              db = null;
            }
            
            // Try to delete the database
            await forceDeleteDatabase(DB_NAME);
            
            // Create a new instance
            db = new JewelleryShopDB();
            await db.open();
            
            console.log('Database reset completed');
          }
        } catch (dbError) {
          console.error('Database initialization failed, attempting reset:', dbError);
          
          // Do a direct reset instead of calling resetDatabase
          // Close any existing connection
          if (db) {
            try {
              db.close();
            } catch (err) {
              // Ignore close errors
            }
            db = null;
          }
          
          // Delete and recreate the database
          await forceDeleteDatabase(DB_NAME);
          
          // Create a new instance
          db = new JewelleryShopDB();
          await db.open();
          
          console.log('Database reset after initialization failure');
        }
      }
      
      // Set up sync scheduler
      if (db && typeof db.setupSyncScheduler === 'function') {
        db.setupSyncScheduler();
      }
      
      // Check for pending sync operations
      try {
        if (db) {
          const count = await db.syncQueue.count();
          setPendingSyncCount(count);
        }
      } catch (countError) {
        console.error('Error counting pending sync operations:', countError);
        setPendingSyncCount(0);
      }
      
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error('Fatal error during database initialization:', error);
      setHasErrors(true);
      return false;
    }
  }, []);
  
  // Reset database by deleting and re-creating it
  const resetDatabase = useCallback(async () => {
    try {
      setIsResetting(true);
      setIsInitialized(false);
      
      // Close existing connection if any
      if (db) {
        try {
          // Stop sync operations
          if (typeof db.stopSyncScheduler === 'function') {
            db.stopSyncScheduler();
          }
          db.close();
        } catch (err) {
          console.warn('Error closing database:', err);
        }
        db = null;
      }
      
      // Try to clear all tables first as a safer approach
      try {
        // Open database temporarily just to clear tables
        const tempDb = new JewelleryShopDB();
        await tempDb.open();
        await clearAllTables(tempDb);
        tempDb.close();
      } catch (clearError) {
        console.warn('Failed to clear tables, will try full deletion:', clearError);
      }
      
      // Try to delete the database completely
      const deleted = await forceDeleteDatabase(DB_NAME);
      
      if (!deleted) {
        console.warn('Database could not be fully deleted, will try to recreate anyway');
      }
      
      // Create a new instance
      db = new JewelleryShopDB();
      
      // Open the database
      await db.open();
      
      // Initialize schemas and tables
      await initialize();
      
      setHasErrors(false);
      setIsResetting(false);
      setIsInitialized(true);
      
      return true;
    } catch (error) {
      console.error('Failed to reset database:', error);
      setHasErrors(true);
      setIsResetting(false);
      return false;
    }
  }, [initialize]);

  // Sync manually (can be triggered by user)
  const sync = useCallback(async () => {
    if (!db || !isInitialized) {
      console.warn('Cannot sync: database not initialized');
      return false;
    }
    
    // Prevent multiple syncs at once
    if (isSyncing) {
      console.warn('Sync already in progress, skipping');
      return false;
    }
    
    try {
      setIsSyncing(true);
      const result = await db.sync();
      setIsSyncing(false);
      return result;
    } catch (error) {
      console.error('Error during manual sync:', error);
      setHasErrors(true);
      setIsSyncing(false);
      return false;
    }
  }, [isInitialized, isSyncing]);

  // Update sync queue count
  const updateSyncCount = useCallback(async () => {
    if (!db || !isInitialized) return;
    
    try {
      const count = await db.syncQueue.count();
      setPendingSyncCount(count);
    } catch (error) {
      console.error('Error counting sync queue:', error);
    }
  }, [isInitialized]);
  
  // Network status listener
  useEffect(() => {
    const removeListener = addNetworkStatusListener((online) => {
      setIsOnline(online);
      
      if (online && db && isInitialized) {
        console.log('Connection restored, starting sync...');
        try {
          db.sync().catch(error => {
            console.error('Error during background sync after connection restored:', error);
            setHasErrors(true);
          });
        } catch (error) {
          console.error('Failed to initiate background sync:', error);
          setHasErrors(true);
        }
      }
    });
    
    return () => removeListener();
  }, [isInitialized]);

  // Initialize database on mount
  useEffect(() => {
    initialize().catch(error => {
      console.error('Error during initialization:', error);
      setHasErrors(true);
    });
    
    return () => {
      // Clean up on unmount
      if (db) {
        try {
          if (typeof db.stopSyncScheduler === 'function') {
            db.stopSyncScheduler();
          }
          
          // Only close if it's actually open
          if (db.isOpen()) {
            db.close();
          }
        } catch (err) {
          console.warn('Error during cleanup:', err);
        }
      }
    };
  }, [initialize]);

  // Periodically update sync count
  useEffect(() => {
    const intervalId = setInterval(updateSyncCount, 5000);
    return () => clearInterval(intervalId);
  }, [updateSyncCount]);

  // Context value with database access and state
  const value = useMemo(() => ({
    isInitialized,
    isOnline,
    pendingSyncCount,
    hasErrors,
    isResetting,
    initialize,
    sync, 
    resetDatabase
  }), [isInitialized, isOnline, pendingSyncCount, hasErrors, isResetting, initialize, sync, resetDatabase]);

  // Global error handler for IndexedDB errors
  useEffect(() => {
    const handleGlobalErrors = (event) => {
      if (event.message && (
        event.message.includes('IndexedDB') || 
        event.message.includes('IDBKeyRange') ||
        event.message.includes('IDBDatabase') ||
        event.message.includes('IDBTransaction')
      )) {
        console.error('Detected IndexedDB error:', event.message);
        setHasErrors(true);
      }
    };

    // Add global error handler
    window.addEventListener('error', handleGlobalErrors);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && (
        event.reason.message.includes('IndexedDB') || 
        event.reason.message.includes('IDBKeyRange') ||
        event.reason.message.includes('IDBDatabase') ||
        event.reason.message.includes('IDBTransaction')
      )) {
        console.error('Unhandled IndexedDB promise rejection:', event.reason.message);
        setHasErrors(true);
      }
    });

    return () => {
      window.removeEventListener('error', handleGlobalErrors);
      window.removeEventListener('unhandledrejection', handleGlobalErrors);
    };
  }, []);

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

// Custom hook to use the database context
export const useDatabase = () => useContext(DatabaseContext);

export default DatabaseContext; 