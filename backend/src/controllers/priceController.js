const { validationResult } = require('express-validator');
const PriceEntry = require('../models/PriceEntry');

// Create a new price entry
exports.createPriceEntry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // Set default user ID for development
    if (!req.body.addedBy) {
      req.body.addedBy = '645f340b631e1f847e33144c'; // Development user ID
    }
    
    const { metalType, purity } = req.body;
    
    // Mark all previous entries for this metal type and purity as inactive
    await PriceEntry.markPreviousEntriesInactive(metalType, purity);
    
    // Create new price entry (finalPricePerGram will be calculated in pre-save hook)
    const priceEntry = new PriceEntry({
      ...req.body,
      isActive: true
    });
    
    await priceEntry.save();
    
    res.status(201).json({ 
      success: true, 
      data: priceEntry
    });
  } catch (error) {
    console.error('Error creating price entry:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// Get all price entries with filters
exports.getPriceEntries = async (req, res) => {
  try {
    const { metalType, purity, from, to, activeOnly } = req.query;
    const filter = {};
    
    // Apply filters if provided
    if (metalType) {
      filter.metalType = metalType;
    }
    
    if (purity) {
      filter.purity = purity;
    }
    
    // Only show active prices if specified
    if (activeOnly === 'true') {
      filter.isActive = true;
    }
    
    if (from || to) {
      filter.effectiveDate = {};
      
      if (from) {
        filter.effectiveDate.$gte = new Date(from);
      }
      
      if (to) {
        filter.effectiveDate.$lte = new Date(to);
      }
    }
    
    const prices = await PriceEntry.find(filter)
      .sort({ effectiveDate: -1, createdAt: -1 })
      .limit(100); // Limit to most recent 100 entries
    
    res.json({ 
      success: true, 
      data: prices
    });
  } catch (error) {
    console.error('Error getting prices:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// Get a single price entry by ID
exports.getPriceEntry = async (req, res) => {
  try {
    const priceEntry = await PriceEntry.findById(req.params.id);
    
    if (!priceEntry) {
      return res.status(404).json({
        success: false,
        message: 'Price entry not found'
      });
    }
    
    res.json({
      success: true,
      data: priceEntry
    });
  } catch (error) {
    console.error('Error getting price entry:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// Update a price entry
exports.updatePriceEntry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    // Get existing price entry
    const existingPrice = await PriceEntry.findById(req.params.id);
    
    if (!existingPrice) {
      return res.status(404).json({
        success: false,
        message: 'Price entry not found'
      });
    }
    
    // If this price is being reactivated or metal/purity changed, deactivate other active prices
    if (
      (req.body.isActive === true && !existingPrice.isActive) ||
      (req.body.metalType && req.body.metalType !== existingPrice.metalType) ||
      (req.body.purity && req.body.purity !== existingPrice.purity)
    ) {
      await PriceEntry.markPreviousEntriesInactive(
        req.body.metalType || existingPrice.metalType,
        req.body.purity || existingPrice.purity
      );
    }
    
    // Update the price entry
    const priceEntry = await PriceEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({ 
      success: true, 
      data: priceEntry
    });
  } catch (error) {
    console.error('Error updating price entry:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// Delete a price entry
exports.deletePriceEntry = async (req, res) => {
  try {
    const priceEntry = await PriceEntry.findByIdAndDelete(req.params.id);
    
    if (!priceEntry) {
      return res.status(404).json({
        success: false,
        message: 'Price entry not found'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Price entry deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting price entry:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// Get latest price for a specific metal and purity
exports.getLatestPrice = async (req, res) => {
  try {
    const { metalType, purity } = req.params;
    
    // Find the active price (should be only one per metal+purity)
    let latestPrice = await PriceEntry.findOne({
      metalType,
      purity,
      isActive: true
    });
    
    // If no active price, fall back to the most recent one
    if (!latestPrice) {
      latestPrice = await PriceEntry.findOne({
        metalType,
        purity
      }).sort({ effectiveDate: -1, createdAt: -1 });
    }
    
    if (!latestPrice) {
      return res.status(404).json({
        success: false,
        message: 'No price entries found for the specified metal and purity'
      });
    }
    
    res.json({
      success: true,
      data: latestPrice
    });
  } catch (error) {
    console.error('Error getting latest price:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
}; 