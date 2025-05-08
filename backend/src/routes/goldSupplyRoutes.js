const express = require('express');
const router = express.Router();
const goldSupplyController = require('../controllers/goldSupplyController');
const { protect } = require('../middleware/auth');
const GoldSupply = require('../models/GoldSupply'); // Add this line

// Base route is /api/gold-supplies

// Get all gold supplies
router.get('/', protect, goldSupplyController.getAllGoldSupplies);

// Get a single gold supply
router.get('/:id', protect, goldSupplyController.getGoldSupplyById);

// Create a new gold supply
router.post('/', protect, goldSupplyController.createGoldSupply);

// Update a gold supply
router.put('/:id', protect, goldSupplyController.updateGoldSupply);

// Delete a gold supply
router.delete('/:id', protect, goldSupplyController.deleteGoldSupply);

// Make payment for a gold supply
router.post('/:id/payment', protect, goldSupplyController.makePayment);

// Test MongoDB connection
router.get('/test-connection', protect, async (req, res) => {
  try {
    // Check if we can access the database
    const count = await GoldSupply.countDocuments();
    
    res.status(200).json({
      success: true,
      message: 'MongoDB Atlas connection successful',
      count: count
    });
  } catch (error) {
    console.error('MongoDB connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'MongoDB Atlas connection failed',
      error: error.message
    });
  }
});

module.exports = router;