// Import the pdf generator and email service
const { generatePurchaseInvoice } = require('../utils/pdfGenerator');
const { 
  sendPurchaseInvoiceEmail, 
  generateInvoiceEmailTemplate 
} = require('../utils/emailService');
const path = require('path');
const fs = require('fs');
const Purchase = require('../models/Purchase');

// Create upload directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../public/uploads/invoices');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Get all purchases
 * @route GET /api/purchases
 */
exports.getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({})
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get a single purchase by ID
 * @route GET /api/purchases/:id
 */
exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('customer')
      .populate('items.product');
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Create a new purchase
 * @route POST /api/purchases
 */
exports.createPurchase = async (req, res) => {
  try {
    const purchaseData = req.body;
    
    // Create purchase
    const purchase = await Purchase.create(purchaseData);
    
    res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update a purchase
 * @route PUT /api/purchases/:id
 */
exports.updatePurchase = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const updateData = req.body;
    
    // Find purchase and update
    const purchase = await Purchase.findByIdAndUpdate(
      purchaseId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Purchase updated successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete a purchase
 * @route DELETE /api/purchases/:id
 */
exports.deletePurchase = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    
    // Find purchase and delete
    const purchase = await Purchase.findByIdAndDelete(purchaseId);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Purchase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Generate PDF invoice for a purchase
 * @route GET /api/purchases/:id/invoice
 */
exports.generateInvoice = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    console.log(`Generating invoice for purchase ID: ${purchaseId}`);
    
    // Find the purchase with populated customer data
    const purchase = await Purchase.findById(purchaseId)
      .populate('customer')
      .populate('items.product');
    
    if (!purchase) {
      console.error(`Purchase not found with ID: ${purchaseId}`);
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }
    
    console.log(`Found purchase: ${purchase.invoiceNumber}`);
    
    // Generate a filename
    const filename = `invoice-${purchase.invoiceNumber}.pdf`;
    const outputPath = path.join(uploadsDir, filename);
    console.log(`PDF will be saved to: ${outputPath}`);
    
    // Generate the PDF
    await generatePurchaseInvoice(purchase, outputPath);
    console.log(`PDF generated successfully at: ${outputPath}`);
    
    // Return the download URL
    const downloadUrl = `/uploads/invoices/${filename}`;
    
    return res.status(200).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        downloadUrl
      }
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Send invoice via email
 * @route POST /api/purchases/:id/email-invoice
 */
exports.emailInvoice = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }
    
    // Find the purchase with populated customer data
    const purchase = await Purchase.findById(purchaseId)
      .populate('customer')
      .populate('items.product');
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }
    
    // Generate the PDF as a buffer
    const pdfBuffer = await generatePurchaseInvoice(purchase);
    
    // Calculate total amount
    const totalAmount = purchase.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    // Generate email HTML using template
    const htmlContent = generateInvoiceEmailTemplate({
      customerName: purchase.customer?.name || 'Valued Customer',
      invoiceNumber: purchase.invoiceNumber,
      purchaseDate: new Date(purchase.createdAt).toLocaleDateString(),
      amount: totalAmount.toFixed(2)
    });
    
    // Send email with PDF attachment
    await sendPurchaseInvoiceEmail({
      to: email,
      subject: `Your Invoice #${purchase.invoiceNumber} from MG Potdar Jewellers`,
      text: `Dear Customer, your invoice #${purchase.invoiceNumber} is attached. Thank you for your business!`,
      html: htmlContent,
      pdfBuffer,
      filename: `Invoice-${purchase.invoiceNumber}.pdf`
    });
    
    return res.status(200).json({
      success: true,
      message: 'Invoice sent via email successfully'
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send invoice email',
      error: error.message
    });
  }
}; 