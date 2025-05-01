const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    purchases: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase'
    }],
    loans: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan'
    }],
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

// Create indexes for searching
customerSchema.index({ name: 'text', email: 'text', phone: 'text' });
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer; 