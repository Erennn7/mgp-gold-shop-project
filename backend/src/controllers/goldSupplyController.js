const GoldSupply = require('../models/GoldSupply');
const { generatePDF } = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');

// Create upload directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../public/uploads/supplies');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Get all gold supplies
 * @route GET /api/gold-supplies
 */
exports.getAllGoldSupplies = async (req, res) => {
  try {
    const goldSupplies = await GoldSupply.find({})
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: goldSupplies.length,
      data: goldSupplies
    });
  } catch (error) {
    console.error('Error fetching gold supplies:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get a single gold supply by ID
 * @route GET /api/gold-supplies/:id
 */
exports.getGoldSupplyById = async (req, res) => {
  try {
    const goldSupply = await GoldSupply.findById(req.params.id);
    
    if (!goldSupply) {
      return res.status(404).json({
        success: false,
        message: 'Gold supply not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: goldSupply
    });
  } catch (error) {
    console.error('Error fetching gold supply:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Create a new gold supply
 * @route POST /api/gold-supplies
 */
exports.createGoldSupply = async (req, res) => {
  try {
    // Log the request body for debugging
    console.log('Creating new gold supply with data:', JSON.stringify(req.body, null, 2));
    
    // Create the gold supply in MongoDB
    const goldSupply = new GoldSupply(req.body);
    
    // Save to MongoDB
    const savedSupply = await goldSupply.save();
    console.log('Gold supply saved successfully with ID:', savedSupply._id);
    
    res.status(201).json({
      success: true,
      data: savedSupply
    });
  } catch (error) {
    console.error('Error creating gold supply:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update a gold supply
 * @route PUT /api/gold-supplies/:id
 */
exports.updateGoldSupply = async (req, res) => {
  try {
    const goldSupply = await GoldSupply.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!goldSupply) {
      return res.status(404).json({
        success: false,
        message: 'Gold supply not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: goldSupply
    });
  } catch (error) {
    console.error('Error updating gold supply:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete a gold supply
 * @route DELETE /api/gold-supplies/:id
 */
exports.deleteGoldSupply = async (req, res) => {
  try {
    const goldSupply = await GoldSupply.findByIdAndDelete(req.params.id);
    
    if (!goldSupply) {
      return res.status(404).json({
        success: false,
        message: 'Gold supply not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting gold supply:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Make payment for a gold supply
 * @route POST /api/gold-supplies/:id/payment
 */
exports.makePayment = async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDate, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }
    
    const goldSupply = await GoldSupply.findById(req.params.id);
    
    if (!goldSupply) {
      return res.status(404).json({
        success: false,
        message: 'Gold supply not found'
      });
    }
    
    // Update the amount paid
    const newAmountPaid = goldSupply.amountPaid + parseFloat(amount);
    
    // Ensure we don't overpay
    if (newAmountPaid > goldSupply.totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds the balance due'
      });
    }
    
    // Update the gold supply
    goldSupply.amountPaid = newAmountPaid;
    goldSupply.balanceDue = goldSupply.totalAmount - newAmountPaid;
    
    // Update payment status
    if (newAmountPaid === 0) {
      goldSupply.paymentStatus = 'pending';
    } else if (newAmountPaid < goldSupply.totalAmount) {
      goldSupply.paymentStatus = 'partial';
    } else {
      goldSupply.paymentStatus = 'completed';
    }
    
    // Add payment notes if provided
    if (notes) {
      goldSupply.notes = goldSupply.notes 
        ? `${goldSupply.notes}\n${new Date().toISOString().split('T')[0]} - Payment: ${notes}`
        : `${new Date().toISOString().split('T')[0]} - Payment: ${notes}`;
    }
    
    await goldSupply.save();
    
    res.status(200).json({
      success: true,
      data: goldSupply
    });
  } catch (error) {
    console.error('Error making payment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};