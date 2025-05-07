const mongoose = require('mongoose');

const goldSupplyItemSchema = new mongoose.Schema({
  type: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  metalType: {
    type: String,
    enum: ['gold', 'silver'],
    default: 'gold'
  },
  purity: {
    type: String,
    required: true,
    trim: true
  },
  netWeight: {
    type: Number,
    required: true,
    min: 0
  },
  grossWeight: {
    type: Number,
    min: 0
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const goldSupplySchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    supplyDate: {
      type: Date,
      default: Date.now
    },
    supplier: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      phone: {
        type: String,
        trim: true
      },
      email: {
        type: String,
        trim: true
      }
    },
    items: [goldSupplyItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed'],
      default: 'pending'
    },
    notes: {
      type: String,
      trim: true
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to calculate balance due
goldSupplySchema.pre('save', function(next) {
  // Calculate balance due
  this.balanceDue = this.totalAmount - this.amountPaid;
  
  // Update payment status based on amounts
  if (this.amountPaid === 0) {
    this.paymentStatus = 'pending';
  } else if (this.amountPaid < this.totalAmount) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'completed';
  }
  
  next();
});

const GoldSupply = mongoose.model('GoldSupply', goldSupplySchema);

module.exports = GoldSupply;