const express = require('express');
const router = express.Router();
const goldPurchaseController = require('../controllers/goldPurchaseController');
const { protect } = require('../middleware/auth');

// Base route is /api/gold-purchases

// Get all gold purchases
router.get('/', protect, goldPurchaseController.getAllGoldPurchases);

// Get pricing information for a specific karat
router.get('/pricing', protect, goldPurchaseController.getPricingInfo);

// Get a single gold purchase
router.get('/:id', protect, goldPurchaseController.getGoldPurchaseById);

// Create a new gold purchase
router.post('/', protect, goldPurchaseController.createGoldPurchase);

// Update a gold purchase
router.put('/:id', protect, goldPurchaseController.updateGoldPurchase);

// Delete a gold purchase
router.delete('/:id', protect, goldPurchaseController.deleteGoldPurchase);

// Generate PDF receipt for a gold purchase
router.get('/:id/receipt', protect, goldPurchaseController.generateReceipt);

// Send receipt via email
router.post('/:id/email-receipt', protect, goldPurchaseController.emailReceipt);

module.exports = router; 