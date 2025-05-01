import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import jwtDecode from 'jwt-decode';
import api from '../utils/api';

// Create context
const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {},
  register: () => {}
});

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  // Function to initialize auth state from storage
  const initializeAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Verify token validity
          const decoded = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp > currentTime) {
            const user = JSON.parse(storedUser);
            setUser(user);
            setToken(storedToken);
            setIsAuthenticated(true);
          } else {
            // Token expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            console.log('Token expired, please login again');
          }
        } catch (err) {
          // Invalid token format, clear it silently
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          console.log('Token validation error (handled gracefully)');
        }
      }
      
      // Authentication check is complete
      setLoading(false);
    } catch (error) {
      // Any other error, authentication check is still complete
      console.error('Auth initialization error:', error);
      setLoading(false);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      const demoUser = {
        _id: 'demo-user',
        name: 'Demo User',
        email: email,
        role: 'admin'
      };
      
      // Set authentication state
      setUser(demoUser);
      setIsAuthenticated(true);
      
      // Store token
      localStorage.setItem('token', 'demo-token');
      
      return true;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // For demo, we'll keep the user logged in
    return;
    
    // Uncomment below for real logout functionality
    /*
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    */
  };

  // Register function (admin only)
  const register = async (userData) => {
    setLoading(true);
    
    try {
      const response = await api.post('/api/auth/register', userData);
      
      if (response.data.success) {
        return { success: true, user: response.data.user };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Registration failed'
      };
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    register
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}; 