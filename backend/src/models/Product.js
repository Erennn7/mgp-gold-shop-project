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
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
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