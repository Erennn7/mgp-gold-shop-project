import axios from 'axios';
import { getNetworkStatus } from './networkStatus';

// Get the base URL from environment variables or use a default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create an instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to handle offline mode
api.interceptors.request.use(
  (config) => {
    // Check if we're online
    if (!navigator.onLine) {
      // Return a rejected promise with a specific error for offline mode
      return Promise.reject({
        isOffline: true,
        message: 'You are currently offline'
      });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Special handling for offline rejection
    if (error.isOffline) {
      return Promise.reject(error);
    }
    
    // Network error
    if (error.message === 'Network Error') {
      console.error('Network error detected');
      return Promise.reject({
        isOffline: true,
        message: 'Network connection error'
      });
    }
    
    // Server errors
    if (error.response) {
      // The request was made and the server responded with a status code outside the 2xx range
      console.error('Server error:', error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      return Promise.reject({
        isOffline: true,
        message: 'No response from server'
      });
    } else {
      // Something happened in setting up the request
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Extract entity type from URL
const getEntityTypeFromUrl = (url) => {
  const apiMatch = url.match(/\/api\/([^/]+)(\/|$)/);
  return apiMatch ? apiMatch[1] : null;
};

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