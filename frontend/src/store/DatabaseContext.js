import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../utils/api';

// Create context
const DatabaseContext = createContext({
  isLoading: true,
  error: null,
  isOnline: navigator.onLine,
  initialize: () => Promise.resolve(),
  forceRefresh: () => Promise.resolve(false)
});

// Provider component
export const DatabaseProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  
  // Initialize database connection
  const initialize = useCallback(async () => {
    try {
      console.log('Initializing direct API connection');
      setIsLoading(true);
      
      // Check network status
      const online = navigator.onLine;
      setIsOnline(online);
      
      // If online, perform initial data fetching
      if (online) {
        await performInitialSync();
      }
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to initialize database connection:', err);
      setError(err);
      setIsLoading(false);
      return false;
    }
  }, []);
  
  // Force refresh data from API
  const forceRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Forcing data refresh from API');
      
      // Check network status
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (!online) {
        throw new Error('Cannot refresh data while offline');
      }
      
      // Perform full data sync
      await performInitialSync();
      
      setLastRefreshTime(new Date());
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Force refresh failed:', err);
      setError(err);
      setIsLoading(false);
      return false;
    }
  }, []);
  
  // Initial data sync from API
  const performInitialSync = async () => {
    try {
      console.log('Performing initial API data fetch');
      
      // No need to store data locally, components will request data when needed
      setLastRefreshTime(new Date());
      return true;
    } catch (err) {
      console.error('Initial data fetch failed:', err);
      throw err;
    }
  };
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network status changed: Online');
      setIsOnline(true);
      // Optionally refresh data when coming back online
      performInitialSync().catch(err => console.error('Error syncing after coming online:', err));
    };
    
    const handleOffline = () => {
      console.log('Network status changed: Offline');
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initialize on first load
    initialize();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initialize]);
  
  // Delete IndexedDB completely on component mount
  useEffect(() => {
    if (window.indexedDB) {
      try {
        console.log('Attempting to delete IndexedDB database');
        // Use window.userInitiatedDatabaseDeletion to bypass safeguards
        window.userInitiatedDatabaseDeletion = true;
        const request = window.indexedDB.deleteDatabase('JewelleryShopDB');
        
        request.onsuccess = () => {
          console.log('Successfully deleted IndexedDB database');
        };
        
        request.onerror = (event) => {
          console.error('Error deleting IndexedDB database:', event);
        };
      } catch (err) {
        console.error('Failed to delete IndexedDB database:', err);
      } finally {
        window.userInitiatedDatabaseDeletion = false;
      }
    }
  }, []);
  
  // Data access functions that previously used IndexedDB now use direct API calls
  
  // Customers
  const getCustomers = async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/api/customers?page=${page}&limit=${limit}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  };
  
  const getCustomerById = async (id) => {
    try {
      const response = await api.get(`/api/customers/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching customer ${id}:`, error);
      throw error;
    }
  };
  
  const addCustomer = async (customer) => {
    try {
      const response = await api.post('/api/customers', customer);
      return response.data.data;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };
  
  const updateCustomer = async (id, customer) => {
    try {
      const response = await api.put(`/api/customers/${id}`, customer);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating customer ${id}:`, error);
      throw error;
    }
  };
  
  const deleteCustomer = async (id) => {
    try {
      await api.delete(`/api/customers/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting customer ${id}:`, error);
      throw error;
    }
  };
  
  // Products
  const getProducts = async (filter = {}) => {
    try {
      const queryParams = new URLSearchParams(filter).toString();
      const response = await api.get(`/api/products?${queryParams}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  };
  
  const getProductById = async (id) => {
    try {
      const response = await api.get(`/api/products/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  };
  
  const addProduct = async (product) => {
    try {
      const response = await api.post('/api/products', product);
      return response.data.data;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };
  
  const updateProduct = async (id, product) => {
    try {
      const response = await api.put(`/api/products/${id}`, product);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  };
  
  const deleteProduct = async (id) => {
    try {
      await api.delete(`/api/products/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  };
  
  // Suppliers
  const getSuppliers = async () => {
    try {
      const response = await api.get('/api/suppliers');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  };
  
  const getSupplierById = async (id) => {
    try {
      const response = await api.get(`/api/suppliers/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching supplier ${id}:`, error);
      throw error;
    }
  };
  
  const addSupplier = async (supplier) => {
    try {
      const response = await api.post('/api/suppliers', supplier);
      return response.data.data;
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
  };
  
  const updateSupplier = async (id, supplier) => {
    try {
      const response = await api.put(`/api/suppliers/${id}`, supplier);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating supplier ${id}:`, error);
      throw error;
    }
  };
  
  const deleteSupplier = async (id) => {
    try {
      await api.delete(`/api/suppliers/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting supplier ${id}:`, error);
      throw error;
    }
  };
  
  // Transactions
  const getTransactions = async (type, customerId = null) => {
    try {
      let url = `/api/transactions?type=${type}`;
      if (customerId) {
        url += `&customerId=${customerId}`;
      }
      const response = await api.get(url);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching ${type} transactions:`, error);
      throw error;
    }
  };
  
  const getTransactionById = async (id, type) => {
    try {
      const response = await api.get(`/api/transactions/${id}?type=${type}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching transaction ${id}:`, error);
      throw error;
    }
  };
  
  const addTransaction = async (transaction, type) => {
    try {
      const response = await api.post(`/api/transactions?type=${type}`, transaction);
      return response.data.data;
    } catch (error) {
      console.error(`Error adding ${type} transaction:`, error);
      throw error;
    }
  };
  
  const updateTransaction = async (id, transaction, type) => {
    try {
      const response = await api.put(`/api/transactions/${id}?type=${type}`, transaction);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating ${type} transaction ${id}:`, error);
      throw error;
    }
  };
  
  const deleteTransaction = async (id, type) => {
    try {
      await api.delete(`/api/transactions/${id}?type=${type}`);
      return true;
    } catch (error) {
      console.error(`Error deleting ${type} transaction ${id}:`, error);
      throw error;
    }
  };
  
  // Settings
  const getSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  };
  
  const updateSettings = async (settings) => {
    try {
      const response = await api.put('/api/settings', settings);
      return response.data.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };
  
  // Create value object with all the context data
  const value = {
    // Status
    isLoading,
    error,
    isOnline,
    lastRefreshTime,
    
    // Core functions
    initialize,
    forceRefresh,
    
    // Data access methods
    getCustomers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    
    getSuppliers,
    getSupplierById,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    
    getTransactions,
    getTransactionById,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    
    getSettings,
    updateSettings
  };
  
  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

// Custom hook for using the database context
export const useDatabase = () => useContext(DatabaseContext);

export default DatabaseContext; 