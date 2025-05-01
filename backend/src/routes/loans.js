const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');

// GET /api/loans - Get all loans
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Find loans and populate customer information
    const loans = await Loan.find(filter)
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: loans 
    });
  } catch (error) {
    console.error('Error getting loans:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// GET /api/loans/:id - Get single loan
router.get('/:id', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('customer', 'name phone email');
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    res.json({
      success: true,
      data: loan
    });
  } catch (error) {
    console.error('Error getting loan:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// POST /api/loans - Create a new loan
router.post('/', async (req, res) => {
  try {
    // Validate customer exists
    const customer = await Customer.findById(req.body.customer);
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }
    
    // Set default user ID for development
    if (!req.body.createdBy) {
      req.body.createdBy = '645f340b631e1f847e33144c'; // Development user ID
    }
    
    // Generate loan number
    const loanCount = await Loan.countDocuments();
    const loanNumber = `LN-${String(loanCount + 1).padStart(4, '0')}`;
    
    const loan = new Loan({
      ...req.body,
      loanNumber
    });
    
    await loan.save();
    
    // Populate customer details
    await loan.populate('customer', 'name phone email');
    
    res.status(201).json({ 
      success: true, 
      data: loan
    });
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// PUT /api/loans/:id - Update a loan
router.put('/:id', async (req, res) => {
  try {
    // Check if customer exists if customer is being updated
    if (req.body.customer) {
      const customer = await Customer.findById(req.body.customer);
      if (!customer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID'
        });
      }
    }
    
    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('customer', 'name phone email');
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    res.json({ 
      success: true, 
      data: loan
    });
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// DELETE /api/loans/:id - Delete a loan
router.delete('/:id', async (req, res) => {
  try {
    const loan = await Loan.findByIdAndDelete(req.params.id);
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Loan deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting loan:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router; 