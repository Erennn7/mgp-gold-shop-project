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
    // Use local MongoDB instance
    const dbURI = 'mongodb+srv://eren:eren17@cluster0.qwo5y5c.mongodb.net/';
    
    // Connection options to handle deprecation warnings
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
      socketTimeoutMS: 45000, // 45 seconds timeout for operations
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Maximum number of connections in the pool
      connectTimeoutMS: 30000, // 30 seconds timeout for initial connection
      retryWrites: true,
      retryReads: true
    };
    
    console.log('Connecting to MongoDB...');
    console.log('Database URI:', dbURI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')); // Hide credentials
    
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      console.log('Closing existing MongoDB connection before reconnecting...');
      await mongoose.connection.close();
    }
    
    // Connect to MongoDB
    const conn = await mongoose.connect(dbURI, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database name: ${conn.connection.name}`);
    console.log(`Connection state: ${mongoose.connection.readyState}`);
    isConnected = true;
    connectionAttempts = 0;
    
    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
      if (isConnected) {
        isConnected = false;
        // Try to reconnect
        attemptReconnect();
      }
    });
    
    // Handle when the connection is disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      if (isConnected) {
        isConnected = false;
        // Try to reconnect
        attemptReconnect();
      }
    });
    
    // Handle when the connection is reconnected
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      isConnected = true;
      connectionAttempts = 0;
    });
    
    // If the Node process ends, close the MongoDB connection
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });
    
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.error(error.stack);
    
    // If not already attempting to reconnect, start reconnection process
    if (isConnected === false && connectionAttempts === 0) {
      attemptReconnect();
    }
    
    // Don't crash the server, just log the error
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
      const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mg-potdar-jewellers';
      await mongoose.connect(dbURI, {
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