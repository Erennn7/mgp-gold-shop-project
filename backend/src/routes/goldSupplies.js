const express = require('express');
const router = express.Router();
const GoldSupply = require('../models/GoldSupply');
const { authenticateJWT } = require('../middleware/auth');

// Get all gold supplies
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let query = {};
    
    // Filter by supplier
    if (req.query.supplier) {
      query.supplier = req.query.supplier;
    }
    
    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.supplyDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      query.supplyDate = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      query.supplyDate = { $lte: new Date(req.query.endDate) };
    }
    
    // Filter by payment status
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }
    
    const supplies = await GoldSupply.find(query)
      .populate('supplier', 'name phone')
      .sort({ supplyDate: -1 });
    
    return res.status(200).json({
      success: true,
      count: supplies.length,
      data: supplies
    });
  } catch (error) {
    console.error('Error fetching gold supplies:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get single gold supply
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const supply = await GoldSupply.findById(req.params.id)
      .populate('supplier', 'name phone email address city state pincode gstin');
    
    if (!supply) {
      return res.status(404).json({
        success: false,
        message: 'Gold supply not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: supply
    });
  } catch (error) {
    console.error('Error fetching gold supply:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Create new gold supply
router.post('/', authenticateJWT, async (req, res) => {
  try {
    // Calculate totals
    let totalAmount = 0;
    if (req.body.items && req.body.items.length > 0) {
      totalAmount = req.body.items.reduce((sum, item) => sum + item.totalAmount, 0);
    }
    
    const supply = new GoldSupply({
      ...req.body,
      totalAmount,
      balanceDue: totalAmount - (req.body.amountPaid || 0),
      createdBy: req.user.id
    });
    
    await supply.save();
    
    return res.status(201).json({
      success: true,
      data: supply
    });
  } catch (error) {
    console.error('Error creating gold supply:', error);
    
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

// Update gold supply
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const supply = await GoldSupply.findById(req.params.id);
    
    if (!supply) {
      return res.status(404).json({
        success: false,
        message: 'Gold supply not found'
      });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      supply[key] = req.body[key];
    });
    
    await supply.save();
    
    return res.status(200).json({
      success: true,
      data: supply
    });
  } catch (error) {
    console.error('Error updating gold supply:', error);
    
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

// Process payment for gold supply
router.post('/:id/payment', authenticateJWT, async (req, res) => {
  try {
    const supply = await GoldSupply.findById(req.params.id);
    
    if (!supply) {
      return res.status(404).json({
        success: false,
        message: 'Gold supply not found'
      });
    }
    
    const { amount, paymentMethod, paymentDate, reference, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }
    
    // Update the amount paid
    supply.amountPaid += parseFloat(amount);
    supply.balanceDue = supply.totalAmount - supply.amountPaid;
    
    // Update payment status
    if (supply.balanceDue <= 0) {
      supply.paymentStatus = 'paid';
    } else {
      supply.paymentStatus = 'partial';
    }
    
    await supply.save();
    
    return res.status(200).json({
      success: true,
      data: supply
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete gold supply
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const supply = await GoldSupply.findById(req.params.id);
    
    if (!supply) {
      return res.status(404).json({
        success: false,
        message: 'Gold supply not found'
      });
    }
    
    await supply.remove();
    
    return res.status(200).json({
      success: true,
      message: 'Gold supply deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gold supply:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router; 