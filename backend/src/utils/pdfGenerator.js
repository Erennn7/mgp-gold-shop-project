const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a PDF invoice for a sale
 * @param {Object} sale - Sale data including items, customer, etc.
 * @param {String} outputPath - Optional path to save the PDF (if not provided, returns buffer)
 * @returns {Promise<Buffer|String>} - Buffer of the PDF or path where it was saved
 */
async function generateSaleInvoice(sale, outputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Invoice #${sale.invoiceNumber}`,
          Author: 'MG Potdar Jewellers',
          Subject: 'Sale Invoice',
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
      doc.text(`Invoice Number: ${sale.invoiceNumber}`, { align: 'left' });
      doc.text(`Date: ${new Date(sale.createdAt).toLocaleDateString()}`, { align: 'left' });
      doc.moveDown();
      
      // Customer details
      doc.fontSize(12).text('Customer Details', { underline: true });
      doc.fontSize(10);
      
      // Handle both expanded and non-expanded customer objects
      const customer = sale.customer;
      if (typeof customer === 'object' && customer !== null) {
        doc.text(`Name: ${customer.name || 'N/A'}`);
        doc.text(`Phone: ${customer.phone || 'N/A'}`);
        doc.text(`Email: ${customer.email || 'N/A'}`);
      } else {
        doc.text(`Customer ID: ${customer || 'N/A'}`);
      }
      
      doc.moveDown();
      
      // Sale items
      doc.fontSize(12).text('Sale Items', { underline: true });
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
      
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item, i) => {
          const y = tableY + i * 20;
          
          // Item details
          const itemName = item.name || 'Product';
          const description = `${item.metalType || 'Gold'} ${item.purity || '24K'} - ${item.weight || 0}g`;
          const quantity = item.quantity || 1;
          const price = item.pricePerGram || 0;
          const amount = item.totalPrice || 0;
          
          totalAmount += amount;
          
          doc
            .fontSize(10)
            .text(itemName, itemX, y)
            .text(description, descriptionX, y)
            .text(quantity.toString(), quantityX, y)
            .text(`₹${price.toFixed(2)}/g`, priceX, y)
            .text(`₹${amount.toFixed(2)}`, amountX, y);
        });
      } else {
        doc.text('No items found in this sale', itemX, tableY);
      }
      
      // Draw total
      const totalY = tableY + (sale.items?.length || 1) * 20 + 20;
      doc.fontSize(12);
      doc.text('Total Amount:', 350, totalY);
      doc.text(`₹${sale.totalAmount ? sale.totalAmount.toFixed(2) : totalAmount.toFixed(2)}`, amountX, totalY);
      
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

/**
 * Generate a PDF receipt for a gold purchase
 * @param {Object} goldPurchase - Gold purchase data including items, customer, etc.
 * @param {String} outputPath - Optional path to save the PDF (if not provided, returns buffer)
 * @returns {Promise<Buffer|String>} - Buffer of the PDF or path where it was saved
 */
async function generateGoldPurchaseReceipt(goldPurchase, outputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Receipt #${goldPurchase.referenceNumber}`,
          Author: 'MG Potdar Jewellers',
          Subject: 'Gold Purchase Receipt',
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
      } else {
        // Generate a default output path in the uploads folder
        const tempFilename = `gold-purchase-receipt-${goldPurchase.referenceNumber}-${Date.now()}.pdf`;
        finalOutputPath = path.join(__dirname, '../../public/uploads/receipts', tempFilename);
        
        // Ensure directory exists
        const dir = path.dirname(finalOutputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        doc.pipe(fs.createWriteStream(finalOutputPath));
      }
      
      // Header with logo and shop details
      doc.fontSize(20).text('MG Potdar Jewellers', { align: 'center' });
      doc.fontSize(12).text('Fine Gold & Silver Ornaments', { align: 'center' });
      doc.fontSize(10).text('123 Main Street, Pune, Maharashtra', { align: 'center' });
      doc.text('Phone: +91 98765 43210 | Email: contact@mgpotdar.com', { align: 'center' });
      doc.moveDown();
      
      // Receipt details section
      doc.fontSize(16).text('GOLD PURCHASE RECEIPT', { align: 'center', underline: true });
      doc.moveDown();
      
      // Create receipt info table
      doc.fontSize(10);
      doc.text(`Reference Number: ${goldPurchase.referenceNumber}`, { align: 'left' });
      doc.text(`Date: ${new Date(goldPurchase.createdAt).toLocaleDateString()}`, { align: 'left' });
      doc.moveDown();
      
      // Customer details
      doc.fontSize(12).text('Customer Details', { underline: true });
      doc.fontSize(10);
      
      // Handle both expanded and non-expanded customer objects
      const customer = goldPurchase.customer;
      if (typeof customer === 'object' && customer !== null) {
        doc.text(`Name: ${customer.name || 'N/A'}`);
        doc.text(`Phone: ${customer.phone || 'N/A'}`);
        doc.text(`Email: ${customer.email || 'N/A'}`);
      } else {
        doc.text(`Customer ID: ${customer || 'N/A'}`);
      }
      
      doc.moveDown();
      
      // Gold Purchase items
      doc.fontSize(12).text('Purchased Items', { underline: true });
      doc.moveDown();
      
      // Table header
      const tableTop = doc.y;
      const itemX = 50;
      const weightX = 180;
      const purityX = 260;
      const karatPurityX = 320;
      const priceX = 380;
      const amountX = 450;
      
      doc
        .fontSize(10)
        .text('Description', itemX, tableTop)
        .text('Weight (g)', weightX, tableTop)
        .text('Purity (%)', purityX, tableTop)
        .text('Karat', karatPurityX, tableTop)
        .text('Price/g', priceX, tableTop)
        .text('Amount', amountX, tableTop);
      
      doc.moveDown();
      let tableY = doc.y;
      
      // Draw items
      let totalAmount = 0;
      
      if (goldPurchase.items && Array.isArray(goldPurchase.items)) {
        goldPurchase.items.forEach((item, i) => {
          const y = tableY + i * 20;
          
          // Item details
          const description = item.description || `${item.metalType} Item`;
          const weight = item.weight || 0;
          const purity = item.purity || 0;
          const karatPurity = item.karatPurity || 'N/A';
          const pricePerGram = item.pricePerGram || 0;
          const totalPrice = item.totalAmount || 0;
          
          totalAmount += totalPrice;
          
          doc
            .fontSize(10)
            .text(description, itemX, y)
            .text(weight.toString(), weightX, y)
            .text(purity.toString() + '%', purityX, y)
            .text(karatPurity, karatPurityX, y)
            .text(`₹${pricePerGram.toFixed(2)}`, priceX, y)
            .text(`₹${totalPrice.toFixed(2)}`, amountX, y);
        });
      } else {
        doc.text('No items found in this purchase', itemX, tableY);
      }
      
      // Draw totals
      const weightTotalY = tableY + (goldPurchase.items?.length || 1) * 20 + 20;
      const amountTotalY = weightTotalY + 20;
      
      doc.fontSize(12);
      
      // Total weight
      doc.text('Total Weight:', 320, weightTotalY);
      doc.text(`${goldPurchase.totalWeight ? goldPurchase.totalWeight.toFixed(2) : '0.00'} g`, 450, weightTotalY);
      
      // Total amount
      doc.text('Total Amount:', 320, amountTotalY);
      doc.text(`₹${goldPurchase.totalAmount ? goldPurchase.totalAmount.toFixed(2) : totalAmount.toFixed(2)}`, 450, amountTotalY);
      
      // Add lines above the totals
      doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(320, weightTotalY - 10)
        .lineTo(500, weightTotalY - 10)
        .stroke();
      
      // Footer with terms
      const footerY = amountTotalY + 80;
      doc.fontSize(10);
      doc.text('Terms & Conditions:', 50, footerY);
      doc.fontSize(8);
      doc.text('1. All purchases are subject to verification of purity.', 50, footerY + 15);
      doc.text('2. Any disputes must be raised within 24 hours of transaction.', 50, footerY + 30);
      doc.text('3. Payment will be processed as per the agreed method.', 50, footerY + 45);
      
      // Add signature
      doc.fontSize(10);
      doc.text('Authorized Signature', 400, footerY + 45);
      
      // Finalize the PDF
      doc.end();
      
      // Wait for the PDF to finish generating
      doc.on('end', () => {
        resolve(finalOutputPath);
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateSaleInvoice,
  generateGoldPurchaseReceipt
};