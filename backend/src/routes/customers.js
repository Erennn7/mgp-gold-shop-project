const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

// GET /api/customers - Get all customers
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    
    console.log('GET /api/customers - Request received with query:', req.query);
    
    // Filter by customer type if provided
    if (type && type !== 'all') {
      filter.customerType = type;
      console.log('Filtering by customerType:', type);
    }
    
    console.log('Using filter:', filter);
    
    // Get total count first - make sure there's no hidden limit
    const totalCount = await Customer.countDocuments({});
    console.log('Total customers in database:', totalCount);
    
    // Direct MongoDB query to double-check
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('customers');
      // Don't limit, get them all
      const directCustomers = await collection.find({}).toArray();
      console.log('Direct MongoDB query found:', directCustomers.length, 'customers');
      
      // Log all direct customers for debugging
      directCustomers.forEach((cust, i) => {
        console.log(`MongoDB Customer ${i + 1}:`, {
          id: cust._id,
          name: cust.name,
          phone: cust.phone
        });
      });
    } catch (dbError) {
      console.error('Error with direct MongoDB query:', dbError);
    }
    
    // Use lean() to get plain objects and ensure no limit
    const customers = await Customer.find(filter).lean().sort({ createdAt: -1 });
    
    console.log(`Returning ${customers.length} customers via Mongoose`);
    
    // Log customer details for debugging
    customers.forEach((customer, index) => {
      console.log(`Customer ${index + 1}:`, {
        id: customer._id,
        name: customer.name,
        phone: customer.phone
      });
    });
    
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