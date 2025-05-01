const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    loanNumber: {
      type: String,
      trim: true,
      unique: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required']
    },
    metalType: {
      type: String,
      enum: ['gold', 'silver', 'platinum', 'other'],
      default: 'gold'
    },
    itemDescription: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: 0
    },
    principalAmount: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: 0
    },
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      min: 0
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue'],
      default: 'active'
    },
    payments: [{
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      date: {
        type: Date,
        required: true,
        default: Date.now
      },
      paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank transfer', 'other'],
        default: 'cash'
      },
      notes: {
        type: String,
        trim: true
      }
    }],
    totalPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for searching and filtering
loanSchema.index({ customer: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ loanNumber: 1 });

// Calculate current balance
loanSchema.methods.calculateBalance = function() {
  const principal = this.principalAmount;
  const payments = this.totalPaid || 0;
  const monthlyRate = this.interestRate / 100;

  // Calculate months elapsed from start date until now (not limited by due date)
  const start = new Date(this.startDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  
  // Calculate compound interest
  // A = P(1 + r)^t where A is final amount, P is principal, r is rate, t is time
  const compoundAmount = principal * Math.pow(1 + monthlyRate, Math.max(months, 0));
  
  // Return total balance (compound amount minus payments)
  return Math.max(0, compoundAmount - payments);
};

// Pre-save hook to check for overdue status
loanSchema.pre('save', function(next) {
  // Set to overdue if past due date and not completed
  if (this.status !== 'completed' && new Date(this.dueDate) < new Date()) {
    this.status = 'overdue';
  }
  next();
});

const Loan = mongoose.model('Loan', loanSchema);

module.exports = Loan; 