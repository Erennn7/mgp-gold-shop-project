const express = require('express');
const { check } = require('express-validator');
const priceController = require('../controllers/priceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Get prices (must be before specific routes with params)
router.get('/', priceController.getPriceEntries);

// Get latest price for specific metal and purity
router.get('/latest/:metalType/:purity', priceController.getLatestPrice);

// Get latest prices for a specific metal
router.get('/latest/:metalType', async (req, res) => {
  try {
    const { metalType } = req.params;
    // Placeholder response
    res.json({
      success: true,
      data: [
        {
          _id: 'price1',
          metalType: metalType,
          purity: metalType === 'gold' ? '24K' : '99.9%',
          pricePerGram: metalType === 'gold' ? 5600 : 80,
          makingCharges: metalType === 'gold' ? 10 : 15,
          gst: 3,
          otherCharges: 1,
          effectiveDate: new Date(),
          notes: 'Latest price',
          createdAt: new Date()
        }
      ]
    });
  } catch (error) {
    console.error('Error getting latest price:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Create a new price entry
router.post(
  '/',
  [
    check('metalType', 'Metal type is required').isIn(['gold', 'silver']),
    check('purity', 'Purity is required').notEmpty(),
    check('pricePerGram', 'Price per gram is required').isNumeric(),
    check('makingCharges', 'Making charges must be a number').optional().isNumeric(),
    check('gst', 'GST must be a number').optional().isNumeric(),
    check('otherCharges', 'Other charges must be a number').optional().isNumeric(),
  ],
  priceController.createPriceEntry
);

// Update a price entry
router.put(
  '/:id',
  [
    check('metalType', 'Metal type must be gold or silver').optional().isIn(['gold', 'silver']),
    check('pricePerGram', 'Price per gram must be a number').optional().isNumeric(),
    check('makingCharges', 'Making charges must be a number').optional().isNumeric(),
    check('gst', 'GST must be a number').optional().isNumeric(),
    check('otherCharges', 'Other charges must be a number').optional().isNumeric(),
  ],
  priceController.updatePriceEntry
);

// Delete a price entry
router.delete('/:id', priceController.deletePriceEntry);

// Get a single price entry (must be after all other routes that use parameters)
router.get('/:id', priceController.getPriceEntry);

module.exports = router; 