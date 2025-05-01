const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  hoid: {
    type: String,
    required: true
  },
  metalType: {
    type: String,
    required: true,
    enum: ['gold', 'silver']
  },
  purity: {
    type: String,
    required: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  pricePerGram: {
    type: Number,
    required: true,
    min: 0
  },
  makingCharges: {
    type: Number,
    min: 0,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required']
    },
    items: [purchaseItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    gst: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank transfer', 'other'],
      default: 'cash'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'partial'],
      default: 'completed'
    },
    notes: {
      type: String,
      trim: true
    },
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    receiptSent: {
      type: Boolean,
      default: false
    },
    receiptSentTo: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for searching and filtering
purchaseSchema.index({ invoiceNumber: 1 });
purchaseSchema.index({ customer: 1 });
purchaseSchema.index({ createdAt: 1 });
purchaseSchema.index({ 'items.metalType': 1 });

// Method to generate PDF receipt
purchaseSchema.methods.generateReceipt = async function() {
  // This will be implemented in a utility function
  return null;
};

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase; 