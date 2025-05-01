const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const { connectDB, testConnection, getConnectionStatus } = require('./config/db');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config();

// Set environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize database connection
connectDB()
  .then(connection => {
    if (connection) {
      console.log('MongoDB connected successfully');
    } else {
      console.log('Running without MongoDB connection. Some features will be limited.');
      
      // Set up mock data handlers for development when DB is not available
      mongoose.connection.db = {
        collection: () => ({
          find: () => ({
            toArray: async () => []
          })
        })
      };
    }
  })
  .catch(error => {
    console.error('Failed to initialize database:', error);
  });

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev')); // Add logging middleware

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MG Potdar Jewellers API' });
});

// Add a simple endpoint for API connectivity check
app.get('/api', (req, res) => {
  const status = getConnectionStatus();
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    database: status
  });
});

// Connection test endpoint
app.post('/api/test-connection', async (req, res) => {
  const { uri } = req.body;
  
  if (!uri) {
    return res.status(400).json({ 
      success: false, 
      message: 'MongoDB URI is required' 
    });
  }
  
  try {
    const result = await testConnection(uri);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Connection test failed' 
    });
  }
});

// Route imports
const productsRoutes = require('./routes/products');
const purchasesRoutes = require('./routes/purchases');
const analyticsRoutes = require('./routes/analytics');
const loansRoutes = require('./routes/loans');
const customersRoutes = require('./routes/customers');
const pricesRoutes = require('./routes/prices');
const authRoutes = require('./routes/auth');

// Mount routes
app.use('/api/products', productsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/auth', authRoutes);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React frontend app
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5001; // Default port is 5001 to avoid conflicts
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 