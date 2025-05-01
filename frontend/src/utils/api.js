import axios from 'axios';
import { getNetworkStatus } from './networkStatus';

// Get the base URL from environment variables or use a default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create an axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Check network status
    const isOnline = await getNetworkStatus();
    
    // Set a custom header for offline mode
    config.headers['X-Offline-Mode'] = !isOnline;
    
    // Get token from local storage
    const token = localStorage.getItem('token');
    
    // If token exists, set the Authorization header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Extract entity type from URL
const getEntityTypeFromUrl = (url) => {
  const apiMatch = url.match(/\/api\/([^/]+)(\/|$)/);
  return apiMatch ? apiMatch[1] : null;
};

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is due to network
    if (error.message === 'Network Error' || !error.response) {
      console.log('Network error detected, handling offline operation');
      
      if (!originalRequest) {
        return Promise.reject({
          isOffline: true,
          message: 'You are currently offline. Your changes will be saved and synchronized when you reconnect.',
          originalError: error,
        });
      }
      
      // Mark request for offline handling
      originalRequest._isOffline = true;
      
      // Get entity type from URL
      const entityType = getEntityTypeFromUrl(originalRequest.url);
      
      if (!entityType) {
        console.error('Could not determine entity type from URL:', originalRequest.url);
        return Promise.reject({
          isOffline: true,
          message: 'You are currently offline. This operation cannot be processed offline.',
          originalError: error,
        });
      }
      
      // Handle different types of requests
      if (originalRequest.method.toLowerCase() === 'get') {
        // For GET requests, try to return cached data
        try {
          // Check cache based on entity type
          const cachedData = await getCachedData(entityType, originalRequest.url);
          
          if (cachedData) {
            console.log(`Returning cached data for ${entityType}`);
            return Promise.resolve({
              data: {
                success: true,
                data: cachedData,
                _isOfflineData: true
              },
              status: 200,
              statusText: 'OK (Cached)',
              headers: {},
              config: originalRequest,
              _isOfflineData: true,
            });
          }
        } catch (cacheError) {
          console.error('Failed to retrieve cached data:', cacheError);
        }
      } else if (originalRequest.method.toLowerCase() === 'post') {
        // For POST requests (creating new items)
        try {
          if (window.db) {
            const data = typeof originalRequest.data === 'string'
              ? JSON.parse(originalRequest.data)
              : originalRequest.data;
            
            // Add tracking metadata
            const timestamp = new Date().toISOString();
            const enhancedData = {
              ...data,
              _modified: true,
              _isNew: true,
              _createdAt: timestamp,
              _lastModified: timestamp
            };
            
            // Add to local database
            const table = window.db.table(entityType);
            const id = await table.add(enhancedData);
            
            // Queue for synchronization
            await window.db.addToSyncQueue(entityType, 'POST', enhancedData);
            
            // Return a successful response with the local ID
            return Promise.resolve({
              data: {
                success: true,
                data: { ...enhancedData, id },
                _isOfflineData: true
              },
              status: 201,
              statusText: 'Created (Offline)',
              headers: {},
              config: originalRequest,
              _isOfflineData: true,
            });
          }
        } catch (dbError) {
          console.error('Failed to store data offline:', dbError);
        }
      } else if (originalRequest.method.toLowerCase() === 'put') {
        // For PUT requests (updating items)
        try {
          if (window.db) {
            // Extract ID from URL
            const idMatch = originalRequest.url.match(/\/([^/]+)$/);
            const serverId = idMatch ? idMatch[1] : null;
            
            if (!serverId) {
              return Promise.reject({
                isOffline: true,
                message: 'Cannot update item offline without an ID',
                originalError: error,
              });
            }
            
            const data = typeof originalRequest.data === 'string'
              ? JSON.parse(originalRequest.data)
              : originalRequest.data;
            
            // Find item in database by server ID
            const table = window.db.table(entityType);
            const existingItem = await table.where('_id').equals(serverId).first();
            
            if (existingItem) {
              // Update with tracking metadata
              const timestamp = new Date().toISOString();
              const enhancedData = {
                ...data,
                _modified: true,
                _lastModified: timestamp
              };
              
              // Update in local database
              await table.update(existingItem.id, enhancedData);
              
              // Queue for synchronization
              await window.db.addToSyncQueue(entityType, 'PUT', enhancedData, serverId);
              
              // Return a successful response
              return Promise.resolve({
                data: {
                  success: true,
                  data: { ...enhancedData, id: existingItem.id, _id: serverId },
                  _isOfflineData: true
                },
                status: 200,
                statusText: 'Updated (Offline)',
                headers: {},
                config: originalRequest,
                _isOfflineData: true,
              });
            }
          }
        } catch (dbError) {
          console.error('Failed to update data offline:', dbError);
        }
      } else if (originalRequest.method.toLowerCase() === 'delete') {
        // For DELETE requests
        try {
          if (window.db) {
            // Extract ID from URL
            const idMatch = originalRequest.url.match(/\/([^/]+)$/);
            const serverId = idMatch ? idMatch[1] : null;
            
            if (!serverId) {
              return Promise.reject({
                isOffline: true,
                message: 'Cannot delete item offline without an ID',
                originalError: error,
              });
            }
            
            // Find item in database by server ID
            const table = window.db.table(entityType);
            const existingItem = await table.where('_id').equals(serverId).first();
            
            if (existingItem) {
              if (existingItem._isNew) {
                // If item was created offline and not synced yet, just delete it
                await table.delete(existingItem.id);
              } else {
                // Mark as deleted but don't remove yet
                await table.update(existingItem.id, { _deleted: true });
                
                // Queue for synchronization
                await window.db.addToSyncQueue(entityType, 'DELETE', existingItem, serverId);
              }
              
              // Return a successful response
              return Promise.resolve({
                data: {
                  success: true,
                  message: 'Item deleted (will be synchronized when online)',
                  _isOfflineData: true
                },
                status: 200,
                statusText: 'Deleted (Offline)',
                headers: {},
                config: originalRequest,
                _isOfflineData: true,
              });
            }
          }
        } catch (dbError) {
          console.error('Failed to delete data offline:', dbError);
        }
      }
      
      // Create a generic offline response if specific handling didn't succeed
      return Promise.reject({
        isOffline: true,
        message: 'You are currently offline. Your changes will be saved and synchronized when you reconnect.',
        originalError: error,
      });
    }
    
    // For 401 (Unauthorized) errors, attempt to refresh token or redirect to login
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Handle token expiration or authentication errors
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Helper function to get cached data
const getCachedData = async (entityType, url) => {
  if (!window.db) return null;
  
  // Apply filters from URL parameters if needed
  const urlObj = new URL(url, API_BASE_URL);
  const params = Object.fromEntries(urlObj.searchParams);
  
  let collection = window.db.table(entityType);
  
  // Apply filters based on entity type and params
  if (entityType === 'products' && params.metalType) {
    collection = collection.where('metalType').equals(params.metalType);
  } else if (entityType === 'prices') {
    if (params.metalType) {
      collection = collection.where('metalType').equals(params.metalType);
    }
    if (params.purity) {
      collection = collection.where('purity').equals(params.purity);
    }
  }
  
  // Check for ID in the URL pattern "entityType/:id"
  const idMatch = url.match(new RegExp(`/api/${entityType}/([^/?]+)`));
  if (idMatch) {
    const id = idMatch[1];
    // Try to find by server ID (_id) first
    const item = await window.db.table(entityType).where('_id').equals(id).first();
    if (item) return item;
    
    // If not found, try local ID
    if (!isNaN(id)) {
      return await window.db.table(entityType).get(Number(id));
    }
    return null;
  }
  
  // Filter out deleted items
  collection = collection.filter(item => !item._deleted);
  
  return collection.toArray();
};

export default api; 