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
    otherCharges: {
      type: Number,
      min: 0,
      default: 0
    },
    finalPricePerGram: {
      type: Number,
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
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to calculate finalPricePerGram
priceEntrySchema.pre('save', function(next) {
  // Calculate final price per gram (now just base price + other charges)
  this.finalPricePerGram = Number(this.pricePerGram) + Number(this.otherCharges || 0);
  
  next();
});

// Create a compound index on metalType, purity, and effectiveDate
priceEntrySchema.index({ metalType: 1, purity: 1, effectiveDate: 1 });

// Static method to get the latest price for a specific metal and purity
priceEntrySchema.statics.getLatestPrice = async function(metalType, purity) {
  return this.findOne({ metalType, purity })
    .sort({ effectiveDate: -1 })
    .exec();
};

// When a new price is added for a metal type and purity, mark previous entries as inactive
priceEntrySchema.statics.markPreviousEntriesInactive = async function(metalType, purity) {
  await this.updateMany(
    { 
      metalType, 
      purity,
      isActive: true 
    },
    { 
      $set: { isActive: false } 
    }
  );
};

const PriceEntry = mongoose.model('PriceEntry', priceEntrySchema);

module.exports = PriceEntry; 