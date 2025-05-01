const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

// GET /api/purchases - Get all purchases
router.get('/', async (req, res) => {
  try {
    let query = {};
    
    // Filter by customer if provided
    if (req.query.customer) {
      query.customer = req.query.customer;
    }
    
    // Get purchases from MongoDB and populate customer info
    const purchases = await Purchase.find(query)
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: purchases 
    });
  } catch (error) {
    console.error('Error getting purchases:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// GET /api/purchases/:id - Get single purchase
router.get('/:id', async (req, res) => {
  try {
    // Find the purchase by ID and populate customer info
    const purchase = await Purchase.findById(req.params.id)
      .populate('customer', 'name phone email');
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }
    
    // Return the found purchase
    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Error getting purchase:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// POST /api/purchases - Create a new purchase
router.post('/', async (req, res) => {
  try {
    // Generate a unique invoice number
    const invoiceNumber = `INV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    // Create a new purchase with the invoice number
    const purchaseData = {
      invoiceNumber,
      ...req.body,
      // Add soldBy field (for now using a default user ID)
      soldBy: req.body.soldBy || '645f340b631e1f847e33144c'
    };
    
    // Create the new purchase in MongoDB
    const newPurchase = new Purchase(purchaseData);
    await newPurchase.save();
    
    // Get full customer data for the response
    await newPurchase.populate('customer', 'name phone email');
    
    // Delete products that have been purchased
    if (newPurchase.items && newPurchase.items.length > 0) {
      for (const item of newPurchase.items) {
        if (item.product) {
          try {
            // Get the product
            const product = await Product.findById(item.product);
            
            if (product) {
              if (product.currentStock <= item.quantity) {
                // If there's no more stock, delete the product
                await Product.findByIdAndDelete(item.product);
                console.log(`Product ${item.product} deleted after purchase`);
              } else {
                // If there's still stock, update the quantity
                product.currentStock -= item.quantity;
                await product.save();
                console.log(`Product ${item.product} stock updated to ${product.currentStock}`);
              }
            }
          } catch (productError) {
            console.error(`Error processing product ${item.product}:`, productError);
          }
        }
      }
    }
    
    // Return the created purchase
    res.status(201).json({ 
      success: true, 
      data: newPurchase
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// PUT /api/purchases/:id - Update a purchase
router.put('/:id', async (req, res) => {
  try {
    // Update the purchase in MongoDB
    const updatedPurchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('customer', 'name phone email');
    
    if (!updatedPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }
    
    // Return the updated purchase
    res.json({ 
      success: true, 
      data: updatedPurchase
    });
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// DELETE /api/purchases/:id - Delete a purchase
router.delete('/:id', async (req, res) => {
  try {
    // Delete the purchase from MongoDB
    const deletedPurchase = await Purchase.findByIdAndDelete(req.params.id);
    
    if (!deletedPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }
    
    // Return success message
    res.json({ 
      success: true, 
      message: 'Purchase deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router; 