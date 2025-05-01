const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a PDF invoice for a purchase
 * @param {Object} purchase - Purchase data including items, customer, etc.
 * @param {String} outputPath - Optional path to save the PDF (if not provided, returns buffer)
 * @returns {Promise<Buffer|String>} - Buffer of the PDF or path where it was saved
 */
async function generatePurchaseInvoice(purchase, outputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Invoice #${purchase.invoiceNumber}`,
          Author: 'MG Potdar Jewellers',
          Subject: 'Purchase Invoice',
        }
      });
      
      // If output path is provided, save to file
      let finalOutputPath = null;
      
      if (outputPath) {
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        finalOutputPath = outputPath;
        doc.pipe(fs.createWriteStream(outputPath));
      }
      
      // For returning as buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      
      // Header with logo and shop details
      doc.fontSize(20).text('MG Potdar Jewellers', { align: 'center' });
      doc.fontSize(12).text('Fine Gold & Silver Ornaments', { align: 'center' });
      doc.fontSize(10).text('123 Main Street, Pune, Maharashtra', { align: 'center' });
      doc.text('Phone: +91 98765 43210 | Email: contact@mgpotdar.com', { align: 'center' });
      doc.moveDown();
      
      // Invoice details section
      doc.fontSize(16).text('INVOICE', { align: 'center', underline: true });
      doc.moveDown();
      
      // Create invoice info table
      doc.fontSize(10);
      doc.text(`Invoice Number: ${purchase.invoiceNumber}`, { align: 'left' });
      doc.text(`Date: ${new Date(purchase.createdAt).toLocaleDateString()}`, { align: 'left' });
      doc.moveDown();
      
      // Customer details
      doc.fontSize(12).text('Customer Details', { underline: true });
      doc.fontSize(10);
      
      // Handle both expanded and non-expanded customer objects
      const customer = purchase.customer;
      if (typeof customer === 'object' && customer !== null) {
        doc.text(`Name: ${customer.name || 'N/A'}`);
        doc.text(`Phone: ${customer.phone || 'N/A'}`);
        doc.text(`Email: ${customer.email || 'N/A'}`);
      } else {
        doc.text(`Customer ID: ${customer || 'N/A'}`);
      }
      
      doc.moveDown();
      
      // Purchase items
      doc.fontSize(12).text('Purchase Items', { underline: true });
      doc.moveDown();
      
      // Table header
      const tableTop = doc.y;
      const itemX = 50;
      const descriptionX = 150;
      const quantityX = 300;
      const priceX = 370;
      const amountX = 450;
      
      doc
        .fontSize(10)
        .text('Item', itemX, tableTop)
        .text('Description', descriptionX, tableTop)
        .text('Qty', quantityX, tableTop)
        .text('Price', priceX, tableTop)
        .text('Amount', amountX, tableTop);
      
      doc.moveDown();
      let tableY = doc.y;
      
      // Draw items
      let totalAmount = 0;
      
      if (purchase.items && Array.isArray(purchase.items)) {
        purchase.items.forEach((item, i) => {
          const y = tableY + i * 20;
          
          // Item details
          const itemName = item.product?.name || item.productName || 'Product';
          const description = `${item.metalType || 'Gold'} ${item.purity || '24K'} - ${item.weight || 0}g`;
          const quantity = item.quantity || 1;
          const price = item.price || 0;
          const amount = price * quantity;
          
          totalAmount += amount;
          
          doc
            .fontSize(10)
            .text(itemName, itemX, y)
            .text(description, descriptionX, y)
            .text(quantity.toString(), quantityX, y)
            .text(`₹${price.toFixed(2)}`, priceX, y)
            .text(`₹${amount.toFixed(2)}`, amountX, y);
        });
      } else {
        doc.text('No items found in this purchase', itemX, tableY);
      }
      
      // Draw total
      const totalY = tableY + (purchase.items?.length || 1) * 20 + 20;
      doc.fontSize(12);
      doc.text('Total Amount:', 350, totalY);
      doc.text(`₹${totalAmount.toFixed(2)}`, amountX, totalY);
      
      // Add a line above the total
      doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(350, totalY - 10)
        .lineTo(500, totalY - 10)
        .stroke();
      
      // Footer with terms and conditions
      const footerY = totalY + 80;
      doc.fontSize(10);
      doc.text('Terms & Conditions:', 50, footerY);
      doc.fontSize(8);
      doc.text('1. All prices include GST where applicable.', 50, footerY + 15);
      doc.text('2. Returns accepted within 7 days with original receipt.', 50, footerY + 30);
      doc.text('3. No refunds on custom orders.', 50, footerY + 45);
      
      // Add signature
      doc.fontSize(10);
      doc.text('Authorized Signature', 400, footerY + 45);
      
      // Finalize the PDF
      doc.end();
      
      // Wait for the PDF to finish generating
      doc.on('end', () => {
        if (finalOutputPath) {
          resolve(finalOutputPath);
        } else {
          // Return as buffer
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generatePurchaseInvoice
};