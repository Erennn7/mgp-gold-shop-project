const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// GET /api/customers - Get all customers
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    
    // Filter by customer type if provided
    if (type && type !== 'all') {
      filter.customerType = type;
    }
    
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: customers 
    });
  } catch (error) {
    console.error('Error getting customers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error getting customer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// POST /api/customers - Create a new customer
router.post('/', async (req, res) => {
  try {
    // Set default user ID for development
    if (!req.body.addedBy) {
      req.body.addedBy = '645f340b631e1f847e33144c'; // Development user ID
    }
    
    const customer = new Customer(req.body);
    await customer.save();
    
    res.status(201).json({ 
      success: true, 
      data: customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// PUT /api/customers/:id - Update a customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    res.json({ 
      success: true, 
      data: customer
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// DELETE /api/customers/:id - Delete a customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Customer deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router; 