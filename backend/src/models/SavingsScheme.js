const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Individual deposit entry schema
const depositSchema = new Schema({
  amount: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 11
  },
  depositDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank transfer', 'other'],
    default: 'cash'
  },
  paymentReference: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
});

// Savings scheme schema
const savingsSchemeSchema = new Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  schemeId: {
    type: String,
    required: true,
    unique: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  monthlyAmount: {
    type: Number,
    required: true
  },
  totalExpectedAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  deposits: [depositSchema],
  // For the 12th month reward
  redemption: {
    isRedeemed: {
      type: Boolean,
      default: false
    },
    redemptionDate: Date,
    goldWeight: Number,
    goldPurity: String,
    productDetails: String,
    invoiceNumber: String,
    notes: String
  },
  // Cancellation details for stopped schemes
  cancellation: {
    date: Date,
    reason: String,
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update the updatedAt field on updates
savingsSchemeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add static method to calculate remaining deposits
savingsSchemeSchema.statics.calculateRemainingDeposits = function(scheme) {
  const depositedMonths = scheme.deposits.map(deposit => deposit.month);
  const allMonths = Array.from({length: 11}, (_, i) => i + 1);
  return allMonths.filter(month => !depositedMonths.includes(month));
};

// Add virtual property to get completion percentage
savingsSchemeSchema.virtual('completionPercentage').get(function() {
  return (this.deposits.length / 11) * 100;
});

// Add virtual property to get total deposited amount
savingsSchemeSchema.virtual('totalDepositedAmount').get(function() {
  return this.deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
});

module.exports = mongoose.model('SavingsScheme', savingsSchemeSchema); 