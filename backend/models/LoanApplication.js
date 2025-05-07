const mongoose = require('mongoose');
// Introducing mongoose to model and communicate with databases

const repaymentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now }, // Date of repayment
  amountPaid: { type: Number, required: true }, // Amount paid in the repayment
  paymentMethod: { type: String }, // Method of payment
  receiptNumber: { type: String }, // Receipt number for tracking
});

// Document verification schema
const documentVerificationSchema = new mongoose.Schema({
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'moreInfo'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationDate: {
    type: Date
  },
  notes: {
    type: String
  }
});

// Loan Application Schema
const loanApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Referring to the User model
    required: true,
  },

  organization: {
    type: String,
    required: true,
  },
// Specifying the organization a specific loan is for
// Declaring input fields
  course: {
    type: String,
    required: true,
  },
// Specifying the course for which the loan request is being made
// Declaring input fields

  amount: {
    type: Number,
    required: true,
  },
// Specifying the loan amount being requested
// Declaring input fields

  // Interest rate is always 0 (interest-free loans)
  interestRate: {
    type: Number,
    default: 0,  // 0% interest rate (interest-free)
  },
  
  totalAmountWithInterest: {
    type: Number,
  },

  status: {
    type: String,
    enum: ['Pending', 'Pending Review', 'Approved', 'Rejected', 'Repaid'], 
    default: 'Pending',
  },
// Establishing current status of the loan application
// Introducing possible status values

  purpose: {
    type: String,
  },
  
  studyDuration: {
    type: Number,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
// Creating a timestamp for when the application was created

  // Track who last updated the application
  updatedAt: {
    type: Date
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Admin notes
  adminNotes: {
    type: String
  },
  
  // Document verification
  documentVerification: documentVerificationSchema,
  
  // Repayment tracking
  repaymentHistory: [repaymentSchema], // Array of repayment objects
  remainingBalance: { type: Number, required: true },
});
// Referring to an array which stores repayment records

// Set total amount (interest-free) before saving
loanApplicationSchema.pre('save', function(next) {
  // Only calculate if this is a new loan or amount has changed
  if (this.isNew || this.isModified('amount')) {
    // Total amount is same as principal since there's no interest
    this.totalAmountWithInterest = this.amount;
    
    // Set the initial remaining balance to the principal amount
    if (this.isNew || this.remainingBalance === this.amount) {
      this.remainingBalance = this.amount;
    }
  }
  next();
});

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
// Exporting the LoanApplication model for use in the application


