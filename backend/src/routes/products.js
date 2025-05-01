const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /api/products - Get all products
router.get('/', async (req, res) => {
  try {
    const { metalType } = req.query;
    const filter = {};
    
    // Filter by metal type if provided
    if (metalType) {
      filter.metalType = metalType;
    }
    
    const products = await Product.find(filter).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: products 
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// POST /api/products - Create a new product
router.post('/', async (req, res) => {
  try {
    // Set default user ID for development
    if (!req.body.addedBy) {
      req.body.addedBy = '645f340b631e1f847e33144c'; // Development user ID
    }
    
    const product = new Product(req.body);
    await product.save();
    
    res.status(201).json({ 
      success: true, 
      data: product 
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// GET /api/products/:id - Get a single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// PUT /api/products/:id - Update a product
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// DELETE /api/products/:id - Delete a product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
