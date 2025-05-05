const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Only use this in development
  }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Configuration Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

/**
 * Generate HTML email template for invoice
 * @param {Object} data - Invoice data
 * @returns {String} - HTML email template
 */
const generateInvoiceEmailTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            padding: 20px 0;
            background-color: #f8f9fa;
            border-radius: 5px;
          }
          .content {
            padding: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px 0;
            font-size: 12px;
            color: #666;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MG Potdar Jewellers</h1>
            <p>Your Invoice #${data.invoiceNumber}</p>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Thank you for your business! Please find attached your invoice #${data.invoiceNumber} for your recent purchase.</p>
            <p>Invoice Details:</p>
            <ul>
              <li>Invoice Number: ${data.invoiceNumber}</li>
              <li>Date: ${data.saleDate}</li>
              <li>Amount: ₹${data.amount}</li>
            </ul>
            <p>If you have any questions about your invoice, please don't hesitate to contact us.</p>
            <p>Best regards,<br>MG Potdar Jewellers Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>MG Potdar Jewellers<br>123 Main Street, Solapur, Maharashtra - 413001<br>Phone: +91 987-654-3210</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Send sale invoice via email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text content
 * @param {String} options.html - HTML content
 * @param {Buffer} options.pdfBuffer - PDF attachment buffer
 * @param {String} options.filename - PDF filename
 */
const sendSaleInvoiceEmail = async (options) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email configuration is missing. Please check your .env file.');
    }

    if (!options.to) {
      throw new Error('Recipient email address is required');
    }

    console.log('Attempting to send email to:', options.to);
    console.log('Using email account:', process.env.EMAIL_USER);

    const mailOptions = {
      from: `"MG Potdar Jewellers" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: [
        {
          filename: options.filename,
          content: options.pdfBuffer
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check your email credentials.');
    } else if (error.code === 'ESOCKET') {
      console.error('Network error. Please check your internet connection.');
    }
    throw error;
  }
};

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
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email configuration is missing. Please check your .env file.');
    }

    if (!to) {
      throw new Error('Recipient email is required');
    }
    
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      throw new Error('Valid PDF file path is required');
    }
    
    console.log('Attempting to send gold purchase receipt to:', to);
    
    // Prepare email data
    const mailOptions = {
      from: `"MG Potdar Jewellers" <${process.env.EMAIL_USER}>`,
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
    console.log('Gold purchase receipt email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending gold purchase receipt email:', error);
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check your email credentials.');
    } else if (error.code === 'ESOCKET') {
      console.error('Network error. Please check your internet connection.');
    }
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
  sendSaleInvoiceEmail,
  generateInvoiceEmailTemplate,
  sendGoldPurchaseReceipt,
  generateReceiptEmailTemplate
}; 