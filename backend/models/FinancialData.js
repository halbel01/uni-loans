const mongoose = require('mongoose');

const financialDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Annual income of the applicant
  annualIncome: {
    type: Number,
    required: true
  },
  
  // Family income
  familyIncome: {
    type: Number,
    required: true
  },
  
  // Any outstanding debts
  outstandingDebts: {
    type: Number,
    default: 0
  },
  
  // Assets value
  assets: {
    type: Number,
    default: 0
  },
  
  // Financial documents
  documents: [{
    type: String,  // Document paths/URLs
    required: false
  }],
  
  // Date when financial information was submitted
  submissionDate: {
    type: Date,
    default: Date.now
  },
  
  // Additional notes or information
  additionalNotes: {
    type: String
  },
  
  incomeSource: {
    type: String,
    required: true
  },
  monthlyIncome: {
    type: Number,
    required: true
  },
  additionalIncome: {
    type: Number,
    default: 0
  },
  incomeProofType: {
    type: String
  },
  monthlyExpenses: {
    type: Number
  },
  accommodationType: {
    type: String
  },
  accommodationCost: {
    type: Number
  },
  existingLoans: {
    type: Boolean,
    default: false
  },
  loanType: String,
  loanAmount: Number,
  monthlyPayment: Number,
  bankName: String,
  accountNumber: String,
  sortCode: String,
  additionalInfo: String
});

const FinancialData = mongoose.model('FinancialData', financialDataSchema);

module.exports = FinancialData;
