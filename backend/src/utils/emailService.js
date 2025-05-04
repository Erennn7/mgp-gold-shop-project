const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Create reusable transporter object using SMTP transport
let transporter = null;

/**
 * Initialize the email transporter
 * @param {Object} config - Email configuration
 * @returns {Object} - Nodemailer transporter
 */
function initTransporter(config = null) {
  if (transporter) {
    return transporter;
  }
  
  // If no config is provided, use environment variables
  const emailConfig = config || {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };
  
  // Create transporter
  transporter = nodemailer.createTransport(emailConfig);
  
  return transporter;
}

/**
 * Send an email with PDF invoice attachment
 * @param {String} to - Recipient email
 * @param {String} subject - Email subject
 * @param {String} htmlContent - HTML email body
 * @param {String} pdfPath - Path to the PDF file
 * @returns {Promise<Object>} - Email send result
 */
async function sendSaleInvoiceEmail(to, subject, htmlContent, pdfPath) {
  try {
    // Initialize transporter if not already done
    if (!transporter) {
      initTransporter();
    }
    
    if (!to) {
      throw new Error('Recipient email is required');
    }
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      throw new Error('Valid PDF file path is required');
    }
    
    // Prepare email data
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'MG Potdar Jewellers <no-reply@mgpotdar.com>',
      to,
      subject,
      html: htmlContent,
      attachments: [{
        filename: 'invoice.pdf',
        path: pdfPath,
        contentType: 'application/pdf'
      }]
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending sale invoice email:', error);
    throw error;
  }
}

/**
 * Send an email with PDF receipt for gold purchase
 * @param {String} to - Recipient email
 * @param {String} subject - Email subject
 * @param {String} htmlContent - HTML email body
 * @param {String} pdfPath - Path to the PDF file
 * @returns {Promise<Object>} - Email send result
 */
async function sendGoldPurchaseReceipt(to, subject, htmlContent, pdfPath) {
  try {
    // Initialize transporter if not already done
    if (!transporter) {
      initTransporter();
    }
    
    if (!to) {
      throw new Error('Recipient email is required');
    }
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      throw new Error('Valid PDF file path is required');
    }
    
    // Prepare email data
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'MG Potdar Jewellers <no-reply@mgpotdar.com>',
      to,
      subject,
      html: htmlContent,
      attachments: [{
        filename: 'gold_purchase_receipt.pdf',
        path: pdfPath,
        contentType: 'application/pdf'
      }]
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending gold purchase receipt email:', error);
    throw error;
  }
}

/**
 * Generate HTML template for emails
 * @param {Object} data - Sale or gold purchase object
 * @param {String} type - Type of email (sale or gold-purchase)
 * @returns {String} - HTML email content
 */
function generateReceiptEmailTemplate(data, type = 'sale') {
  // Default shop info
  const shopName = 'MG Potdar Jewellers';
  const shopPhone = '+91 98765 43210';
  const shopEmail = 'contact@mgpotdar.com';
  
  // Get customer name
  const customerName = data.customer && typeof data.customer === 'object' 
    ? data.customer.name || 'Valued Customer' 
    : 'Valued Customer';
  
  // Different content based on type
  if (type === 'sale') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo {
            font-size: 24px;
            color: #8B4513;
            font-weight: bold;
          }
          .invoice-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777;
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 15px;
          }
          .highlight {
            font-weight: bold;
            color: #8B4513;
          }
          .button {
            display: inline-block;
            background-color: #8B4513;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${shopName}</div>
          <div>Fine Gold & Silver Ornaments</div>
        </div>
        
        <p>Dear ${customerName},</p>
        
        <p>Thank you for your recent purchase at ${shopName}. Your invoice is attached to this email as a PDF file.</p>
        
        <div class="invoice-details">
          <p><strong>Invoice Number:</strong> ${data.invoiceNumber || 'N/A'}</p>
          <p><strong>Purchase Date:</strong> ${new Date(data.createdAt).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> ₹${data.totalAmount ? data.totalAmount.toFixed(2) : '0.00'}</p>
        </div>
        
        <p>If you have any questions about your purchase or need assistance, please don't hesitate to contact us:</p>
        
        <p>
          Phone: <span class="highlight">${shopPhone}</span><br>
          Email: <span class="highlight">${shopEmail}</span>
        </p>
        
        <div class="footer">
          <p>Thank you for shopping with us!</p>
          <p>${shopName} | Fine Gold & Silver Ornaments</p>
          <p>123 Main Street, Pune, Maharashtra</p>
        </div>
      </body>
      </html>
    `;
  } else if (type === 'gold-purchase') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo {
            font-size: 24px;
            color: #8B4513;
            font-weight: bold;
          }
          .receipt-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777;
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 15px;
          }
          .highlight {
            font-weight: bold;
            color: #8B4513;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${shopName}</div>
          <div>Fine Gold & Silver Ornaments</div>
        </div>
        
        <p>Dear ${customerName},</p>
        
        <p>Thank you for choosing ${shopName} to sell your precious metal. Your transaction receipt is attached to this email as a PDF file.</p>
        
        <div class="receipt-details">
          <p><strong>Reference Number:</strong> ${data.referenceNumber || 'N/A'}</p>
          <p><strong>Transaction Date:</strong> ${new Date(data.createdAt).toLocaleDateString()}</p>
          <p><strong>Total Weight:</strong> ${data.totalWeight ? data.totalWeight.toFixed(2) : '0.00'} g</p>
          <p><strong>Total Amount:</strong> ₹${data.totalAmount ? data.totalAmount.toFixed(2) : '0.00'}</p>
        </div>
        
        <p>If you have any questions about this transaction or need assistance, please don't hesitate to contact us:</p>
        
        <p>
          Phone: <span class="highlight">${shopPhone}</span><br>
          Email: <span class="highlight">${shopEmail}</span>
        </p>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>${shopName} | Fine Gold & Silver Ornaments</p>
          <p>123 Main Street, Pune, Maharashtra</p>
        </div>
      </body>
      </html>
    `;
  } else {
    throw new Error(`Invalid email template type: ${type}`);
  }
}

module.exports = {
  initTransporter,
  sendSaleInvoiceEmail,
  sendGoldPurchaseReceipt,
  generateReceiptEmailTemplate
}; 