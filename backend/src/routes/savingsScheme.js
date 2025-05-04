const express = require('express');
const router = express.Router();
const SavingsScheme = require('../models/SavingsScheme');
const Customer = require('../models/Customer');
const { authenticateJWT } = require('../middleware/auth');

// Get all savings schemes
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const schemes = await SavingsScheme.find()
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });
      
    return res.status(200).json({
      success: true,
      count: schemes.length,
      data: schemes
    });
  } catch (error) {
    console.error('Error fetching savings schemes:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get savings schemes for a specific customer
router.get('/customer/:customerId', authenticateJWT, async (req, res) => {
  try {
    const schemes = await SavingsScheme.find({ customer: req.params.customerId })
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });
      
    return res.status(200).json({
      success: true,
      count: schemes.length,
      data: schemes
    });
  } catch (error) {
    console.error('Error fetching customer savings schemes:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get a single savings scheme
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const scheme = await SavingsScheme.findById(req.params.id)
      .populate('customer', 'name phone email address city pincode');
      
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Savings scheme not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error('Error fetching savings scheme:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Create a new savings scheme
router.post('/', authenticateJWT, async (req, res) => {
  try {
    // Check if customer exists
    const customer = await Customer.findById(req.body.customer);
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Generate a unique scheme ID
    const schemeId = `SAV-${Date.now().toString().slice(-6)}`;
    
    // Calculate total expected amount (monthly amount * 12)
    const totalExpectedAmount = req.body.monthlyAmount * 12;
    
    // Create new savings scheme
    const scheme = new SavingsScheme({
      customer: req.body.customer,
      schemeId,
      startDate: req.body.startDate || new Date(),
      monthlyAmount: req.body.monthlyAmount,
      totalExpectedAmount,
      status: 'active',
      deposits: req.body.initialDeposit ? [
        {
          amount: req.body.monthlyAmount,
          month: 1,
          depositDate: new Date(),
          paymentMethod: req.body.paymentMethod || 'cash',
          paymentReference: req.body.paymentReference || '',
          notes: req.body.notes || ''
        }
      ] : [],
      createdBy: req.user.id
    });
    
    await scheme.save();
    
    return res.status(201).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error('Error creating savings scheme:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Add a deposit to a savings scheme
router.post('/:id/deposit', authenticateJWT, async (req, res) => {
  try {
    const scheme = await SavingsScheme.findById(req.params.id);
    
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Savings scheme not found'
      });
    }
    
    if (scheme.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot add deposit to a ${scheme.status} scheme`
      });
    }
    
    // Check if this month already has a deposit
    const existingDeposit = scheme.deposits.find(d => d.month === req.body.month);
    if (existingDeposit) {
      return res.status(400).json({
        success: false,
        message: `Month ${req.body.month} already has a deposit`
      });
    }
    
    // Add the new deposit
    scheme.deposits.push({
      amount: req.body.amount || scheme.monthlyAmount,
      month: req.body.month,
      depositDate: req.body.depositDate || new Date(),
      paymentMethod: req.body.paymentMethod || 'cash',
      paymentReference: req.body.paymentReference || '',
      notes: req.body.notes || ''
    });
    
    // Check if all 11 months are completed
    if (scheme.deposits.length === 11) {
      // Auto-update scheme to completed status
      scheme.status = 'completed';
    }
    
    await scheme.save();
    
    return res.status(200).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error('Error adding deposit:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Record redemption of a scheme
router.post('/:id/redeem', authenticateJWT, async (req, res) => {
  try {
    const scheme = await SavingsScheme.findById(req.params.id);
    
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Savings scheme not found'
      });
    }
    
    if (scheme.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot redeem scheme that is not completed'
      });
    }
    
    if (scheme.redemption.isRedeemed) {
      return res.status(400).json({
        success: false,
        message: 'Scheme has already been redeemed'
      });
    }
    
    // Update redemption details
    scheme.redemption = {
      isRedeemed: true,
      redemptionDate: req.body.redemptionDate || new Date(),
      goldWeight: req.body.goldWeight,
      goldPurity: req.body.goldPurity,
      productDetails: req.body.productDetails || '',
      invoiceNumber: req.body.invoiceNumber || '',
      notes: req.body.notes || ''
    };
    
    await scheme.save();
    
    return res.status(200).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error('Error processing redemption:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update a savings scheme
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const scheme = await SavingsScheme.findById(req.params.id);
    
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Savings scheme not found'
      });
    }
    
    // Only allow updating certain fields
    if (req.body.monthlyAmount) scheme.monthlyAmount = req.body.monthlyAmount;
    if (req.body.status) scheme.status = req.body.status;
    if (req.body.notes) scheme.notes = req.body.notes;
    
    // Recalculate total expected amount if monthly amount changes
    if (req.body.monthlyAmount) {
      scheme.totalExpectedAmount = req.body.monthlyAmount * 12;
    }
    
    await scheme.save();
    
    return res.status(200).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error('Error updating savings scheme:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Cancel/Stop a savings scheme
router.post('/:id/cancel', authenticateJWT, async (req, res) => {
  try {
    const scheme = await SavingsScheme.findById(req.params.id);
    
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Savings scheme not found'
      });
    }
    
    if (scheme.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a scheme that is already ${scheme.status}`
      });
    }
    
    // Update scheme status to cancelled
    scheme.status = 'cancelled';
    
    // Add cancellation details if provided
    if (req.body.cancellationReason) {
      scheme.cancellation = {
        date: new Date(),
        reason: req.body.cancellationReason,
        processedBy: req.user.id,
        notes: req.body.notes || ''
      };
    }
    
    await scheme.save();
    
    return res.status(200).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error('Error cancelling savings scheme:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router; 