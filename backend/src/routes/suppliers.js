const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { authenticateJWT } = require('../middleware/auth');

// Get all suppliers
router.get('/', authenticateJWT, async (req, res) => {
  console.log('GET /api/suppliers - Request received');
  try {
    console.log('Attempting to fetch suppliers from database');
    const suppliers = await Supplier.find().sort({ name: 1 });
    console.log(`Found ${suppliers.length} suppliers`);
    
    return res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get single supplier
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Create new supplier
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const supplier = new Supplier({
      ...req.body,
      createdBy: req.user.id
    });
    
    await supplier.save();
    
    return res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update supplier
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      supplier[key] = req.body[key];
    });
    
    await supplier.save();
    
    return res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete supplier
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    await supplier.remove();
    
    return res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router; 