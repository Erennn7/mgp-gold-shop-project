const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Track connection status
let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000; // 5 seconds

// MongoDB connection function
const connectDB = async () => {
  try {
    // Check if we're running in Electron
    const isElectron = process.env.ELECTRON_RUN === 'true';
    
    // Use MongoDB Atlas URI from environment variables
    const dbURI = process.env.MONGO_URI || 'mongodb+srv://eren:eren17@cluster0.qwo5y5c.mongodb.net/';
    
    console.log('Connecting to MongoDB Atlas:', dbURI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@'));
    
    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    };
    
    // Connect to MongoDB Atlas
    const conn = await mongoose.connect(dbURI, options);
    console.log(`MongoDB Atlas connected: ${conn.connection.host}`);
    
    // Set connection status
    isConnected = true;
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    isConnected = false;
    
    // Retry connection if needed
    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      connectionAttempts++;
      console.log(`Retrying connection (${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${RECONNECT_INTERVAL/1000} seconds...`);
      
      setTimeout(() => {
        connectDB();
      }, RECONNECT_INTERVAL);
    }
    
    return null;
  }
};

// Attempt to reconnect to MongoDB
const attemptReconnect = () => {
  if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`Failed to reconnect to MongoDB after ${MAX_RECONNECT_ATTEMPTS} attempts`);
    return;
  }
  
  connectionAttempts++;
  console.log(`Attempting to reconnect to MongoDB (attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
  
  setTimeout(async () => {
    try {
      await mongoose.connect('mongodb+srv://eren:eren17@cluster0.qwo5y5c.mongodb.net/' , {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Successfully reconnected to MongoDB');
      isConnected = true;
      connectionAttempts = 0;
    } catch (error) {
      console.error(`Failed reconnection attempt: ${error.message}`);
      attemptReconnect();
    }
  }, RECONNECT_INTERVAL);
};

// Test a MongoDB connection URI
const testConnection = async (uri) => {
  let testConn;
  
  try {
    // Try to connect to the test URI
    testConn = await mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Short timeout for test
      connectTimeoutMS: 5000,
    });
    
    // Close the test connection
    await testConn.close();
    
    return {
      success: true,
      message: 'Connection successful'
    };
  } catch (error) {
    console.error(`Connection test failed: ${error.message}`);
    
    // Try to close connection if it was opened
    if (testConn) {
      try {
        await testConn.close();
      } catch (closeError) {
        console.error('Error closing test connection:', closeError);
      }
    }
    
    return {
      success: false,
      message: error.message
    };
  }
};

// Get connection status
const getConnectionStatus = () => {
  return {
    isConnected,
    host: mongoose.connection.host || 'Not connected',
    database: mongoose.connection.name || 'Not connected'
  };
};

module.exports = { 
  connectDB, 
  testConnection, 
  getConnectionStatus 
};