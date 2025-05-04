const mongoose = require('mongoose');
const patchSchema = require('./saleItemValidator');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true // Will be patched by validator
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
  },
  isSmallItem: {
    type: Boolean,
    default: false
  }
});

const saleSchema = new mongoose.Schema(
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
    items: [saleItemSchema],
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
saleSchema.index({ invoiceNumber: 1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ createdAt: 1 });
saleSchema.index({ 'items.metalType': 1 });

// Pre-save hook to handle small items
saleSchema.pre('validate', function(next) {
  console.log('Pre-validate hook running');
  
  // Process items to ensure proper validation for small items
  if (this.items && this.items.length > 0) {
    this.items.forEach((item, index) => {
      console.log(`Item ${index}: name=${item.name}, isSmallItem=${item.isSmallItem}, product=${item.product}`);
      
      // For small items, ensure product is null
      if (item.isSmallItem) {
        console.log(`Setting product=null for small item: ${item.name}`);
        item.product = null;
      }
    });
  }
  
  next();
});

// Method to generate PDF receipt
saleSchema.methods.generateReceipt = async function() {
  // This will be implemented in a utility function
  return null;
};

const Sale = mongoose.model('Sale', saleSchema);

// Apply custom validation patch after model is created
patchSchema(saleSchema);

module.exports = Sale; 