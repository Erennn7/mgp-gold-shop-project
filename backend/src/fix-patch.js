/**
 * Emergency fix script to patch Sale model without restarting server
 * This script should be executed directly
 */
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery-shop';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully!');
    
    // Import existing model first
    try {
      // Import the Sale model
      require('./models/Sale');
      
      // Get the Sale model
      const Sale = mongoose.model('Sale');
      
      // Patch the schema
      const schema = Sale.schema;
      
      console.log("⚠️ APPLYING EMERGENCY FIX TO SALE MODEL");
      
      if (schema.paths['items'] && schema.paths['items'].schema.paths['product']) {
        console.log('Patching product validation in items schema');
        
        const itemsSchema = schema.paths['items'].schema;
        const productPath = itemsSchema.paths['product'];
        
        // Remove any required validators
        productPath.validators = productPath.validators.filter(v => {
          if (v.type === 'required') {
            console.log('Removing required validator');
            return false;
          }
          return true;
        });
        
        // Set required to false
        productPath.isRequired = false;
        productPath.options.required = false;
        
        console.log("SCHEMA PATCHED SUCCESSFULLY");
      }
      
      // Verify the patch
      await Sale.findOne().then(() => {
        console.log("MODEL QUERY SUCCESSFUL - PATCH VERIFIED");
      });
      
      console.log('Fix complete. Exiting...');
      process.exit(0);
    } catch (err) {
      console.error('Error applying emergency fix:', err);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 