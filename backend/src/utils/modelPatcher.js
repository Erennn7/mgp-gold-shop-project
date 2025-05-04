/**
 * Utility to apply runtime patches to Mongoose models
 */
const mongoose = require('mongoose');

// Apply the patch to the model after it's already registered
exports.fixSaleModel = function() {
  // Get the model
  const Sale = mongoose.model('Sale');
  
  // Get the schema
  const schema = Sale.schema;
  
  console.log("⚠️ APPLYING RUNTIME FIX TO SALE MODEL");
  
  // Fix the product validation in the item schema
  if (schema.paths['items'] && schema.paths['items'].schema.paths['product']) {
    console.log('Patching product validation in Sale model item schema');
    
    const productPath = schema.paths['items'].schema.paths['product'];
    
    // Remove any required validators
    productPath.validators = productPath.validators.filter(v => {
      if (v.type === 'required') {
        console.log('Removing required validator from product field');
        return false;
      }
      return true;
    });
    
    // Set required to false explicitly
    productPath.isRequired = false;
    productPath.options.required = false;
    
    // Add custom validator that checks isSmallItem
    productPath.validators.push({
      validator: function(value) {
        console.log(`Validating product ${value} for item ${this.name}, isSmallItem=${this.isSmallItem}`);
        // Skip validation for small items
        if (this.isSmallItem === true) {
          return true;
        }
        // Require product for regular items
        return value != null;
      },
      message: props => `Product is required for regular items (${props.value})`,
      type: 'customValidator'
    });
    
    console.log('Successfully patched Sale model');
  } else {
    console.error('Could not find items.product path in Sale schema');
  }
}; 