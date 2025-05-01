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

    // Calculate final price per gram
    const { pricePerGram, makingCharges, gst, otherCharges } = req.body;
    const finalPricePerGram = 
      Number(pricePerGram) + 
      (Number(pricePerGram) * Number(makingCharges || 0) / 100) +
      (Number(pricePerGram) * Number(gst || 0) / 100) +
      Number(otherCharges || 0);
    
    const priceEntry = new PriceEntry({
      ...req.body,
      finalPricePerGram: Number(finalPricePerGram.toFixed(2))
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
    const { metalType, purity, from, to } = req.query;
    const filter = {};
    
    // Apply filters if provided
    if (metalType) {
      filter.metalType = metalType;
    }
    
    if (purity) {
      filter.purity = purity;
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
    
    // If price components are updated, recalculate final price
    if (req.body.pricePerGram || req.body.makingCharges || req.body.gst || req.body.otherCharges) {
      // Get existing price entry
      const existingPrice = await PriceEntry.findById(req.params.id);
      
      if (!existingPrice) {
        return res.status(404).json({
          success: false,
          message: 'Price entry not found'
        });
      }
      
      // Calculate new final price
      const pricePerGram = req.body.pricePerGram || existingPrice.pricePerGram;
      const makingCharges = req.body.makingCharges || existingPrice.makingCharges;
      const gst = req.body.gst || existingPrice.gst;
      const otherCharges = req.body.otherCharges || existingPrice.otherCharges;
      
      const finalPricePerGram = 
        Number(pricePerGram) + 
        (Number(pricePerGram) * Number(makingCharges) / 100) +
        (Number(pricePerGram) * Number(gst) / 100) +
        Number(otherCharges);
      
      req.body.finalPricePerGram = Number(finalPricePerGram.toFixed(2));
    }
    
    const priceEntry = await PriceEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
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
    
    const latestPrice = await PriceEntry.findOne({
      metalType,
      purity
    }).sort({ effectiveDate: -1, createdAt: -1 });
    
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