const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { protect } = require('../middleware/auth');
const Product = require('../models/Product');

// Base route is /api/sales

// Get all sales
router.get('/', protect, saleController.getAllSales);

// Get a single sale
router.get('/:id', protect, saleController.getSaleById);

// Middleware to update inventory after a sale is created
const updateInventory = async (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = async function() {
    // Only process if the response is successful (sale created)
    if (this.statusCode === 201 && res.locals.saleData) {
      try {
        const sale = res.locals.saleData;
        
        // Process each item in the sale
        for (const item of sale.items) {
          // Skip items marked as small items or items without product reference
          if (item.isSmallItem || !item.product) {
            console.log(`Item "${item.name}" is a small item or has no product reference, skipping inventory update`);
            continue;
          }
          
          // If this item has a product reference, update its inventory
          try {
            // Find the product
            const product = await Product.findById(item.product);
            
            if (product) {
              // Check if this is a manually entered item without proper inventory tracking
              const hasInventoryTracking = typeof product.currentStock !== 'undefined';
              
              // Only update inventory if we're tracking it for this product
              if (hasInventoryTracking) {
                // Update inventory: reduce stock by quantity sold
                if (product.currentStock <= item.quantity) {
                  // If there's no more stock, delete the product
                  await Product.findByIdAndDelete(item.product);
                  console.log(`Product ${item.product} deleted after sale (out of stock)`);
                } else {
                  // Otherwise just reduce the stock
                  product.currentStock -= item.quantity;
                  await product.save();
                  console.log(`Product ${item.product} stock updated to ${product.currentStock}`);
                }
              } else {
                console.log(`Product ${item.product} has no inventory tracking, skipping update`);
              }
            } else {
              console.log(`Product ${item.product} not found, possibly already removed`);
            }
          } catch (productError) {
            console.error(`Error updating product ${item.product}:`, productError);
            // Continue processing other items even if one fails
          }
        }
      } catch (error) {
        console.error('Error updating inventory after sale:', error);
        // Don't block the response if inventory update fails
      }
    }
    
    // Call the original end method
    originalEnd.apply(this, arguments);
  };
  
  next();
};

// Middleware to save sale data for inventory processing
const saveSaleData = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && data.success && data.data) {
      res.locals.saleData = data.data;
    }
    return originalJson.call(this, data);
  };
  
  next();
};

// Create a new sale (with inventory update)
router.post('/', protect, saveSaleData, updateInventory, saleController.createSale);

// Update a sale
router.put('/:id', protect, saleController.updateSale);

// Delete a sale
router.delete('/:id', protect, saleController.deleteSale);

// Generate PDF invoice for a sale
router.get('/:id/invoice', protect, saleController.generateInvoice);

// Send invoice via email
router.post('/:id/email-invoice', protect, saleController.emailInvoice);

module.exports = router; 