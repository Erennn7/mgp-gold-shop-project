// Track the current online status
let isOnline = navigator.onLine;

// Set up event listeners for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    
    // Trigger a custom event for components to listen to
    window.dispatchEvent(new CustomEvent('networkStatusChanged', { detail: { isOnline } }));
    
    // Attempt to sync data
    if (window.db && window.db.sync) {
      window.db.sync().catch(console.error);
    }
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    
    // Trigger a custom event for components to listen to
    window.dispatchEvent(new CustomEvent('networkStatusChanged', { detail: { isOnline } }));
  });
}

/**
 * Get the current network status
 * @returns {Promise<boolean>} True if online, false if offline
 */
export const getNetworkStatus = async () => {
  // If in an Electron environment, check network status using NodeJS capabilities
  if (window.electron) {
    try {
      // Ping our actual backend API server instead of Google
      const response = await fetch('http://localhost:5001/api', { 
        mode: 'no-cors', 
        cache: 'no-store',
        timeout: 2000 // Short timeout
      });
      return true;
    } catch (error) {
      console.log("Network check failed:", error);
      return navigator.onLine; // Fall back to navigator.onLine if fetch fails
    }
  }
  
  // For web environment, use navigator.onLine
  return isOnline;
};

/**
 * Add a listener for network status changes
 * @param {Function} callback The callback to run when network status changes
 * @returns {Function} A function to remove the listener
 */
export const addNetworkStatusListener = (callback) => {
  const listener = (event) => {
    callback(event.detail.isOnline);
  };
  
  window.addEventListener('networkStatusChanged', listener);
  
  // Return function to remove the listener
  return () => {
    window.removeEventListener('networkStatusChanged', listener);
  };
}; 