const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Gold supply item schema
const supplyItemSchema = new Schema({
  itemType: {
    type: String,
    required: true,
    enum: ['ring', 'necklace', 'bracelet', 'earring', 'chain', 'pendant', 'bangle', 'nose-pin', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    trim: true
  },
  metalType: {
    type: String,
    required: true,
    enum: ['gold', 'silver', 'platinum', 'other'],
    default: 'gold'
  },
  purity: {
    type: String,
    required: true,
    trim: true
  },
  grossWeight: {
    type: Number,
    required: true,
    min: 0
  },
  netWeight: {
    type: Number,
    required: true,
    min: 0
  },
  weightUnit: {
    type: String,
    enum: ['g', 'mg', 'kg', 'oz'],
    default: 'g'
  },
  hasStones: {
    type: Boolean,
    default: false
  },
  stoneDetails: {
    type: String,
    trim: true
  },
  stoneWeight: {
    type: Number,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  ratePerGram: {
    type: Number,
    min: 0
  },
  makingCharges: {
    type: Number,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    min: 0,
    required: true
  },
  remarks: String
});

// Gold supply schema
const goldSupplySchema = new Schema({
  supplier: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  supplyDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  items: [supplyItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'pending'],
    default: 'pending'
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
  paymentDueDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
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
goldSupplySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total amount
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  }
  
  // Calculate balance due
  this.balanceDue = this.totalAmount - this.amountPaid;
  
  // Update payment status
  if (this.balanceDue <= 0) {
    this.paymentStatus = 'paid';
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'pending';
  }
  
  next();
});

module.exports = mongoose.model('GoldSupply', goldSupplySchema); 