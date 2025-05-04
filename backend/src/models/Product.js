const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    hoid: {
      type: String,
      required: [true, 'HOID is required'],
      unique: true,
      trim: true
    },
    metalType: {
      type: String,
      enum: ['gold', 'silver'],
      required: [true, 'Metal type is required']
    },
    purity: {
      type: String,
      required: [true, 'Purity is required'],
      trim: true
    },
    netWeight: {
      type: Number,
      required: [true, 'Net weight (metal only) is required'],
      min: 0
    },
    grossWeight: {
      type: Number,
      required: [true, 'Gross weight (total) is required'],
      min: 0
    },
    hasStones: {
      type: Boolean,
      default: false
    },
    stoneDetails: {
      type: String,
      trim: true
    },
    stonePrice: {
      type: Number,
      default: 0,
      min: 0
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      trim: true
    },
    currentStock: {
      type: Number,
      default: 1,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    customFields: {
      type: Map,
      of: String
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for searching
productSchema.index({ name: 'text', hoid: 'text' });
productSchema.index({ metalType: 1 });
productSchema.index({ hoid: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 