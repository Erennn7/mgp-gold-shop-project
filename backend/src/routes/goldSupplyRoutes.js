const express = require('express');
const router = express.Router();
const goldSupplyController = require('../controllers/goldSupplyController');
const { protect } = require('../middleware/auth');

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

module.exports = router;