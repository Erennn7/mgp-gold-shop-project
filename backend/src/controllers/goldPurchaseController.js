// Import the pdf generator and email service
const { generateGoldPurchaseReceipt } = require('../utils/pdfGenerator');
const { 
  sendGoldPurchaseReceipt, 
  generateReceiptEmailTemplate 
} = require('../utils/emailService');
const path = require('path');
const fs = require('fs');
const GoldPurchase = require('../models/GoldPurchase');
const PriceEntry = require('../models/PriceEntry');

// Create upload directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../public/uploads/receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Get all gold purchases
 * @route GET /api/gold-purchases
 */
exports.getAllGoldPurchases = async (req, res) => {
  try {
    const goldPurchases = await GoldPurchase.find({})
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: goldPurchases.length,
      data: goldPurchases
    });
  } catch (error) {
    console.error('Error fetching gold purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get a single gold purchase by ID
 * @route GET /api/gold-purchases/:id
 */
exports.getGoldPurchaseById = async (req, res) => {
  try {
    const goldPurchase = await GoldPurchase.findById(req.params.id)
      .populate('customer')
      .populate('processedBy');
    
    if (!goldPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Gold purchase not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: goldPurchase
    });
  } catch (error) {
    console.error('Error fetching gold purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Create a new gold purchase
 * @route POST /api/gold-purchases
 */
exports.createGoldPurchase = async (req, res) => {
  try {
    const purchaseData = req.body;
    
    // Process each item to ensure totalAmount is calculated correctly
    if (purchaseData.items && Array.isArray(purchaseData.items)) {
      purchaseData.items = purchaseData.items.map(item => {
        // Calculate total amount based on weight, purity and price per gram
        const totalAmount = item.weight * (item.purity / 100) * item.pricePerGram;
        return {
          ...item,
          totalAmount: parseFloat(totalAmount.toFixed(2))
        };
      });
    }
    
    // Calculate total weight and amount (will also be done in pre-save hook)
    const totalWeight = purchaseData.items.reduce((sum, item) => sum + item.weight, 0);
    const totalAmount = purchaseData.items.reduce((sum, item) => sum + item.totalAmount, 0);
    
    purchaseData.totalWeight = totalWeight;
    purchaseData.totalAmount = totalAmount;
    
    // Create the gold purchase
    const goldPurchase = await GoldPurchase.create(purchaseData);
    
    res.status(201).json({
      success: true,
      message: 'Gold purchase recorded successfully',
      data: goldPurchase
    });
  } catch (error) {
    console.error('Error creating gold purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update a gold purchase
 * @route PUT /api/gold-purchases/:id
 */
exports.updateGoldPurchase = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const updateData = req.body;
    
    // Find gold purchase and update
    const goldPurchase = await GoldPurchase.findByIdAndUpdate(
      purchaseId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!goldPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Gold purchase not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Gold purchase updated successfully',
      data: goldPurchase
    });
  } catch (error) {
    console.error('Error updating gold purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete a gold purchase
 * @route DELETE /api/gold-purchases/:id
 */
exports.deleteGoldPurchase = async (req, res) => {
  try {
    const goldPurchase = await GoldPurchase.findById(req.params.id);
    
    if (!goldPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Gold purchase not found'
      });
    }
    
    await goldPurchase.remove();
    
    res.status(200).json({
      success: true,
      message: 'Gold purchase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gold purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Generate receipt for a gold purchase
 * @route GET /api/gold-purchases/:id/receipt
 */
exports.generateReceipt = async (req, res) => {
  try {
    const goldPurchase = await GoldPurchase.findById(req.params.id)
      .populate('customer')
      .populate('processedBy');
    
    if (!goldPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Gold purchase not found'
      });
    }
    
    // Generate the receipt PDF
    const pdfPath = await generateGoldPurchaseReceipt(goldPurchase);
    
    if (!pdfPath) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate receipt'
      });
    }
    
    // Send the file
    res.download(pdfPath, `gold-purchase-receipt-${goldPurchase.referenceNumber}.pdf`, (err) => {
      if (err) {
        console.error('Error sending receipt:', err);
      }
      
      // Delete the file after sending
      fs.unlink(pdfPath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temp file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Email receipt to the customer
 * @route POST /api/gold-purchases/:id/email-receipt
 */
exports.emailReceipt = async (req, res) => {
  try {
    const goldPurchase = await GoldPurchase.findById(req.params.id)
      .populate('customer')
      .populate('processedBy');
    
    if (!goldPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Gold purchase not found'
      });
    }
    
    // Check if customer has email
    if (!goldPurchase.customer.email) {
      return res.status(400).json({
        success: false,
        message: 'Customer does not have an email address'
      });
    }
    
    // Generate the receipt PDF
    const pdfPath = await generateGoldPurchaseReceipt(goldPurchase);
    
    if (!pdfPath) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate receipt'
      });
    }
    
    // Generate email content
    const emailContent = generateReceiptEmailTemplate(goldPurchase, 'gold-purchase');
    
    // Send email with attachment
    const emailResult = await sendGoldPurchaseReceipt(
      goldPurchase.customer.email,
      `Receipt for Gold Purchase #${goldPurchase.referenceNumber}`,
      emailContent,
      pdfPath
    );
    
    // Update receipt sent status
    goldPurchase.receiptSent = true;
    goldPurchase.receiptSentTo = goldPurchase.customer.email;
    await goldPurchase.save();
    
    // Delete the temp file
    fs.unlink(pdfPath, (unlinkErr) => {
      if (unlinkErr) {
        console.error('Error deleting temp file:', unlinkErr);
      }
    });
    
    res.status(200).json({
      success: true,
      message: `Receipt sent to ${goldPurchase.customer.email} successfully`
    });
  } catch (error) {
    console.error('Error emailing receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get pricing information for a specific karat
 * @route GET /api/gold-purchases/pricing
 */
exports.getPricingInfo = async (req, res) => {
  try {
    const { metalType, karatPurity } = req.query;
    
    if (!metalType || !karatPurity) {
      return res.status(400).json({
        success: false,
        message: 'Metal type and karat purity are required'
      });
    }
    
    // Get the latest price for the specified metal and purity
    const priceEntry = await PriceEntry.getLatestPrice(metalType, karatPurity);
    
    if (!priceEntry) {
      return res.status(404).json({
        success: false,
        message: `No price found for ${metalType} with purity ${karatPurity}`
      });
    }
    
    res.status(200).json({
      success: true,
      data: priceEntry
    });
  } catch (error) {
    console.error('Error getting pricing info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}; 