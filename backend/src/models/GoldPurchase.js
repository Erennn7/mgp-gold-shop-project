const mongoose = require('mongoose');

const goldPurchaseItemSchema = new mongoose.Schema({
  metalType: {
    type: String,
    required: true,
    enum: ['gold', 'silver']
  },
  description: {
    type: String,
    required: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  purity: {
    type: Number, // Purity in percentage (0-100)
    required: true,
    min: 0,
    max: 100
  },
  karatPurity: {
    type: String, // Karat purity (e.g., "22K", "24K")
    required: true
  },
  pricePerGram: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  }
});

const goldPurchaseSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: [true, 'Reference number is required'],
      unique: true,
      trim: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required']
    },
    items: [goldPurchaseItemSchema],
    totalWeight: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank transfer', 'cheque', 'other'],
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
    processedBy: {
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
goldPurchaseSchema.index({ referenceNumber: 1 });
goldPurchaseSchema.index({ customer: 1 });
goldPurchaseSchema.index({ createdAt: 1 });
goldPurchaseSchema.index({ 'items.metalType': 1 });

// Pre-save hook to calculate total weight and amount
goldPurchaseSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate total weight and amount
    this.totalWeight = this.items.reduce((sum, item) => sum + item.weight, 0);
    this.totalAmount = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  }
  next();
});

// Method to generate PDF receipt
goldPurchaseSchema.methods.generateReceipt = async function() {
  // This will be implemented in a utility function
  return null;
};

const GoldPurchase = mongoose.model('GoldPurchase', goldPurchaseSchema);

module.exports = GoldPurchase; 