import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import App from './App';
import theme from './theme';
import { AuthProvider } from './store/AuthContext';
import { DatabaseProvider } from './store/DatabaseContext';
import { ToastContainer } from 'react-toastify';
import './styles/toastify.css'; // Use our custom CSS instead of react-toastify's CSS

// Safeguard against automatic database deletion
// This detects and prevents any code trying to delete our database on page load
(function preventDatabaseDeletion() {
  try {
    // Store the original deleteDatabase method
    const originalDeleteDatabase = window.indexedDB.deleteDatabase;
    
    // Override the deleteDatabase method
    window.indexedDB.deleteDatabase = function(name) {
      // Allow deletion only if it's not our main database or if explicitly called by user action
      if (name !== 'JewelleryShopDB' || window.userInitiatedDatabaseDeletion) {
        console.log(`Allowing deletion of database: ${name}`);
        return originalDeleteDatabase.apply(window.indexedDB, arguments);
      } else {
        console.warn(`Prevented automatic deletion of database: ${name}`);
        
        // Return a mock request object that simulates success but doesn't actually delete
        const mockRequest = {
          onsuccess: null,
          onerror: null,
          onblocked: null,
          error: null,
          result: null,
          source: null,
          transaction: null,
          readyState: 'done'
        };
        
        // Simulate success asynchronously
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess(new Event('success'));
          }
        }, 50);
        
        return mockRequest;
      }
    };
    
    console.log('Installed database deletion safeguard');
  } catch (err) {
    console.error('Failed to install database deletion safeguard:', err);
  }
})();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <DatabaseProvider>
            <App />
          </DatabaseProvider>
        </AuthProvider>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
    </ThemeProvider>
  </React.StrictMode>
); 