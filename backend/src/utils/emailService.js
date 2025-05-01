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
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text email body
 * @param {String} options.html - HTML email body (optional)
 * @param {Buffer|String} options.pdfBuffer - PDF buffer or file path
 * @param {String} options.filename - Attachment filename
 * @returns {Promise<Object>} - Email send result
 */
async function sendPurchaseInvoiceEmail(options) {
  try {
    // Initialize transporter if not already done
    if (!transporter) {
      initTransporter();
    }
    
    // Default values
    const {
      to,
      subject = 'Your Purchase Invoice from MG Potdar Jewellers',
      text = 'Please find attached your purchase invoice. Thank you for shopping with us!',
      html,
      pdfBuffer,
      filename = 'invoice.pdf'
    } = options;
    
    if (!to) {
      throw new Error('Recipient email is required');
    }
    
    if (!pdfBuffer) {
      throw new Error('PDF content is required');
    }
    
    // Prepare email data
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'MG Potdar Jewellers <no-reply@mgpotdar.com>',
      to,
      subject,
      text,
    };
    
    // Add HTML body if provided
    if (html) {
      mailOptions.html = html;
    }
    
    // Add PDF attachment
    if (typeof pdfBuffer === 'string' && fs.existsSync(pdfBuffer)) {
      // It's a file path
      mailOptions.attachments = [{
        filename,
        path: pdfBuffer,
        contentType: 'application/pdf'
      }];
    } else if (Buffer.isBuffer(pdfBuffer)) {
      // It's a buffer
      mailOptions.attachments = [{
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }];
    } else {
      throw new Error('Invalid PDF content: must be a buffer or file path');
    }
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Generate default HTML template for invoice emails
 * @param {Object} data - Template data
 * @returns {String} - HTML email content
 */
function generateInvoiceEmailTemplate(data = {}) {
  const {
    customerName = 'Valued Customer',
    invoiceNumber = '',
    purchaseDate = new Date().toLocaleDateString(),
    amount = '0.00',
    shopName = 'MG Potdar Jewellers',
    shopPhone = '+91 98765 43210',
    shopEmail = 'contact@mgpotdar.com'
  } = data;
  
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
        <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
        <p><strong>Purchase Date:</strong> ${purchaseDate}</p>
        <p><strong>Total Amount:</strong> ₹${amount}</p>
      </div>
      
      <p>If you have any questions about your purchase or need assistance, please don't hesitate to contact us:</p>
      
      <p>
        Phone: <span class="highlight">${shopPhone}</span><br>
        Email: <span class="highlight">${shopEmail}</span>
      </p>
      
      <p>We value your business and look forward to serving you again soon.</p>
      
      <p>Warm regards,<br>
      ${shopName} Team</p>
      
      <div class="footer">
        <p>This is an automated email. Please do not reply directly to this message.</p>
        <p>© ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  initTransporter,
  sendPurchaseInvoiceEmail,
  generateInvoiceEmailTemplate
}; 