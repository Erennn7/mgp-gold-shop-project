/**
 * Custom validator for sale items to handle small items properly
 */

// Export a patch function for Mongoose schema
module.exports = function patchMongooseSchema(schema) {
  // Make the product field not required
  if (schema.paths['items'] && schema.paths['items'].schema.paths['product']) {
    console.log('Patching product validation in saleItemSchema');
    
    // Remove the required validation
    schema.paths['items'].schema.paths['product'].validators = 
      schema.paths['items'].schema.paths['product'].validators.filter(v => 
        v.type !== 'required'
      );
    
    // Add custom validator
    schema.paths['items'].schema.paths['product'].validators.push({
      validator: function(value) {
        // Allow null/undefined product only for small items
        if (!value && this.isSmallItem !== true) {
          return false;
        }
        return true;
      },
      message: 'Product is required for non-small items',
      type: 'customRequired'
    });
  }

  return schema;
}; 