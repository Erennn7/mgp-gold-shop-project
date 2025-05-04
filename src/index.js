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