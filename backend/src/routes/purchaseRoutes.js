const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

// Base route is /api/purchases

// Get all purchases
router.get('/', protect, purchaseController.getAllPurchases);

// Get a single purchase
router.get('/:id', protect, purchaseController.getPurchaseById);

// Create a new purchase
router.post('/', protect, purchaseController.createPurchase);

// Update a purchase
router.put('/:id', protect, purchaseController.updatePurchase);

// Delete a purchase
router.delete('/:id', protect, purchaseController.deletePurchase);

// Generate PDF invoice for a purchase
router.get('/:id/invoice', protect, purchaseController.generateInvoice);

// Send invoice via email
router.post('/:id/email-invoice', protect, purchaseController.emailInvoice);

module.exports = router; 