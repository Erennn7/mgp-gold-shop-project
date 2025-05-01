const mongoose = require('mongoose');

const priceEntrySchema = new mongoose.Schema(
  {
    metalType: {
      type: String,
      enum: ['gold', 'silver'],
      required: [true, 'Metal type is required']
    },
    purity: {
      type: String,
      required: [true, 'Purity is required'],
      // For gold: 22K, 24K, etc. For silver: 92.5%, 99.9%, etc.
      trim: true
    },
    pricePerGram: {
      type: Number,
      required: [true, 'Price per gram is required'],
      min: 0
    },
    makingCharges: {
      type: Number,
      required: [true, 'Making charges are required'],
      min: 0,
      default: 0
    },
    gst: {
      type: Number,
      min: 0,
      default: 3 // 3% GST on jewellery
    },
    otherCharges: {
      type: Number,
      min: 0,
      default: 0
    },
    finalPricePerGram: {
      type: Number,
      required: [true, 'Final price per gram is required'],
      min: 0
    },
    effectiveDate: {
      type: Date,
      required: [true, 'Effective date is required'],
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Create a compound index on metalType, purity, and effectiveDate
priceEntrySchema.index({ metalType: 1, purity: 1, effectiveDate: 1 });

// Static method to get the latest price for a specific metal and purity
priceEntrySchema.statics.getLatestPrice = async function(metalType, purity) {
  return this.findOne({ metalType, purity })
    .sort({ effectiveDate: -1 })
    .exec();
};

const PriceEntry = mongoose.model('PriceEntry', priceEntrySchema);

module.exports = PriceEntry; 