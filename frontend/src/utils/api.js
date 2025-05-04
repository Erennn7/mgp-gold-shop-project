import axios from 'axios';
import { getNetworkStatus } from './networkStatus';

// Get the base URL from environment variables or use a default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';
console.log('API base URL configured as:', API_BASE_URL);

// Create an axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for authentication
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API error response:', error.response.status, error.response.data);
      
      // Handle authentication errors
      if (error.response.status === 401) {
        console.log('Authentication error, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Optionally redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network error detected');
    } else {
      // Something happened in setting up the request that triggered an error
      console.error('API error:', error.message);
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