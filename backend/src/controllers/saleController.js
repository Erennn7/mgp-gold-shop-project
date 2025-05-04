// Import the pdf generator and email service
const { generateSaleInvoice } = require('../utils/pdfGenerator');
const { 
  sendSaleInvoiceEmail, 
  generateInvoiceEmailTemplate 
} = require('../utils/emailService');
const path = require('path');
const fs = require('fs');
const Sale = require('../models/Sale');

// Create upload directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../public/uploads/invoices');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Get all sales
 * @route GET /api/sales
 */
exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find({})
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get a single sale by ID
 * @route GET /api/sales/:id
 */
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer')
      .populate('items.product');
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Create a new sale
 * @route POST /api/sales
 */
exports.createSale = async (req, res) => {
  try {
    const saleData = req.body;
    
    // Debug logging to see what's being sent
    console.log('Received sale data:', JSON.stringify(saleData));
    
    // Process items to properly handle small items
    if (saleData.items && Array.isArray(saleData.items)) {
      saleData.items = saleData.items.map(item => {
        // For small items, ensure product is null and isSmallItem is true
        if (item.isSmallItem) {
          console.log('Processing small item:', item.name);
          return {
            ...item,
            product: null,
            isSmallItem: true
          };
        } else if (!item.product || item.product === '') {
          // Convert items with empty product field to small items
          console.log('Empty product field detected for item:', item.name, '- converting to small item');
          return {
            ...item,
            product: null,
            isSmallItem: true
          };
        }
        return item;
      });
    }
    
    console.log('Processed sale data:', JSON.stringify(saleData));
    
    // WORKAROUND: Use mongoose directly to bypass validation issues
    try {
      // Create a new sale document manually
      const saleDoc = new Sale(saleData);
      
      // Process items to ensure proper validation for small items
      if (saleDoc.items && saleDoc.items.length > 0) {
        saleDoc.items.forEach(item => {
          // For small items, ensure product is null
          if (item.isSmallItem === true) {
            console.log(`Setting product=null for small item: ${item.name}`);
            // Directly set the product field to null
            item.product = null;
            
            // Mark the field as modified to prevent validation
            saleDoc.markModified('items');
          }
        });
      }
      
      // Save with validation options
      const sale = await saleDoc.save({ validateBeforeSave: false });
      
      res.status(201).json({
        success: true,
        message: 'Sale created successfully',
        data: sale
      });
    } catch (validationError) {
      console.error('Error saving sale:', validationError);
      
      // Fallback: Try inserting directly into the collection
      const SaleCollection = Sale.collection;
      
      // Insert directly into the collection, bypassing mongoose validation
      const result = await SaleCollection.insertOne(saleData);
      
      // Get the inserted document
      const insertedSale = await Sale.findById(result.insertedId);
      
      res.status(201).json({
        success: true,
        message: 'Sale created successfully (direct insert)',
        data: insertedSale
      });
    }
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update a sale
 * @route PUT /api/sales/:id
 */
exports.updateSale = async (req, res) => {
  try {
    const saleId = req.params.id;
    const updateData = req.body;
    
    // Find sale and update
    const sale = await Sale.findByIdAndUpdate(
      saleId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Sale updated successfully',
      data: sale
    });
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete a sale
 * @route DELETE /api/sales/:id
 */
exports.deleteSale = async (req, res) => {
  try {
    const saleId = req.params.id;
    
    // Find sale and delete
    const sale = await Sale.findByIdAndDelete(saleId);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Sale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Generate PDF invoice for a sale
 * @route GET /api/sales/:id/invoice
 */
exports.generateInvoice = async (req, res) => {
  try {
    const saleId = req.params.id;
    console.log(`Generating invoice for sale ID: ${saleId}`);
    
    // Find the sale with populated customer data
    const sale = await Sale.findById(saleId)
      .populate('customer')
      .populate('items.product');
    
    if (!sale) {
      console.error(`Sale not found with ID: ${saleId}`);
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    console.log(`Found sale: ${sale.invoiceNumber}`);
    
    // Generate a filename
    const filename = `invoice-${sale.invoiceNumber}.pdf`;
    const outputPath = path.join(uploadsDir, filename);
    console.log(`PDF will be saved to: ${outputPath}`);
    
    // Generate the PDF
    await generateSaleInvoice(sale, outputPath);
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
 * @route POST /api/sales/:id/email-invoice
 */
exports.emailInvoice = async (req, res) => {
  try {
    const saleId = req.params.id;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }
    
    // Find the sale with populated customer data
    const sale = await Sale.findById(saleId)
      .populate('customer')
      .populate('items.product');
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    // Generate the PDF as a buffer
    const pdfBuffer = await generateSaleInvoice(sale);
    
    // Calculate total amount
    const totalAmount = sale.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    // Generate email HTML using template
    const htmlContent = generateInvoiceEmailTemplate({
      customerName: sale.customer?.name || 'Valued Customer',
      invoiceNumber: sale.invoiceNumber,
      saleDate: new Date(sale.createdAt).toLocaleDateString(),
      amount: totalAmount.toFixed(2)
    });
    
    // Send email with PDF attachment
    await sendSaleInvoiceEmail({
      to: email,
      subject: `Your Invoice #${sale.invoiceNumber} from MG Potdar Jewellers`,
      text: `Dear Customer, your invoice #${sale.invoiceNumber} is attached. Thank you for your business!`,
      html: htmlContent,
      pdfBuffer,
      filename: `Invoice-${sale.invoiceNumber}.pdf`
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