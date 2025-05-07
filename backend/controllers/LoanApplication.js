const LoanApplication = require('../models/LoanApplication');
const User = require('../models/User');
const UserDocument = require('../models/UserDocument');
const FinancialData = require('../models/FinancialData');

// Submit a new loan application
exports.submitLoanApplication = async (req, res) => {
  const {
    userId,
    organization,
    course,
    amount,
    purpose,
    studyDuration,
    // Additional fields
  } = req.body;

  try {
    console.log(`Processing loan application for user: ${userId}`);
    
    // First verify that user has uploaded the required documents
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for identity documents
    const userDocuments = await UserDocument.find({ userId });
    console.log(`Found ${userDocuments.length} total user documents`);
    
    const identityDocs = userDocuments.filter(doc => doc.category === 'identity');
    const financialDocsInUserDocs = userDocuments.filter(doc => doc.category === 'financial');
    
    console.log(`Found ${identityDocs.length} identity documents`);
    console.log(`Found ${financialDocsInUserDocs.length} financial documents in UserDocument`);
    
    // Check for financial documents in FinancialData
    const financialData = await FinancialData.findOne({ userId });
    console.log(`Financial data found: ${financialData ? 'Yes' : 'No'}`);
    
    const financialDocsInFinancialData = financialData && financialData.documents ? financialData.documents : [];
    console.log(`Found ${financialDocsInFinancialData.length} financial documents in FinancialData`);
    
    // Consider documents from either collection
    const hasIdentityDocs = identityDocs.length > 0;
    const hasFinancialDocs = financialDocsInUserDocs.length > 0 || financialDocsInFinancialData.length > 0;
    
    // Check if financial data has been submitted and completed
    const hasFinancialDataSubmission = financialData ? true : false;
    
    console.log(`Has identity docs: ${hasIdentityDocs}, Has financial docs: ${hasFinancialDocs}, Has financial data: ${hasFinancialDataSubmission}`);
    
    // Verify documents are present
    if (!hasIdentityDocs) {
      return res.status(403).json({ 
        message: 'You must upload identification documents before applying for a loan.',
        missingDocuments: 'identification' 
      });
    }
    
    if (!hasFinancialDocs) {
      return res.status(403).json({ 
        message: 'You must upload financial documents before applying for a loan.',
        missingDocuments: 'financial'
      });
    }
    
    // Verify financial data is present
    if (!hasFinancialDataSubmission) {
      return res.status(403).json({ 
        message: 'You must complete your financial information before applying for a loan.',
        missingData: 'financial'
      });
    }
    
    // If we get here, documents and financial data are verified
    console.log('Document and financial data verification passed. Creating loan application.');

    // No interest calculation since loans are interest-free
    const interestRate = 0; // 0% interest (interest-free)
    const totalAmountWithInterest = parseFloat(amount); // Total amount equals principal amount

    // Proceed with loan application submission
    const loanApplication = new LoanApplication({
      userId,
      organization,
      course,
      amount: parseFloat(amount),
      interestRate,
      totalAmountWithInterest,
      purpose,
      studyDuration,
      status: 'Pending',
      remainingBalance: totalAmountWithInterest, // Remaining balance is the same as principal
      // Additional fields
    });

    await loanApplication.save();
    console.log(`Loan application saved successfully with ID: ${loanApplication._id}`);

    res.status(201).json({ 
      message: 'Loan application submitted successfully',
      application: loanApplication
    });
  } catch (error) {
    console.error('Error submitting loan application:', error);
    res.status(500).json({ message: 'Error submitting loan application' });
  }
};

// Review a loan application
exports.reviewLoanApplication = async (req, res) => {
  try {
    const { loanId, status } = req.body;

    const loan = await LoanApplication.findById(loanId);
    if (!loan) return res.status(404).json({ message: 'Loan application not found.' });

    loan.status = status;
    await loan.save();

    res.status(200).json({ message: `Loan status updated to: ${status}` });
  } catch (error) {
    console.error('Error reviewing loan application:', error);
    res.status(500).json({ message: 'Failed to review loan application.' });
  }
};

// Make a repayment
exports.makeRepayment = async (req, res) => {
  const { loanId, amountPaid, paymentMethod } = req.body;

  try {
    console.log(`Processing payment of £${amountPaid} for loan ${loanId} using ${paymentMethod}`);
    
    // Validate inputs
    if (!loanId || !amountPaid || !paymentMethod) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide loanId, amountPaid, and paymentMethod.' 
      });
    }

    // Find the loan
    const loan = await LoanApplication.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Verify loan is approved
    if (loan.status !== 'Approved' && loan.status !== 'Repaid') {
      return res.status(400).json({ 
        message: 'Can only make payments on approved loans',
        status: loan.status
      });
    }

    // Check if payment amount is valid
    const paymentAmount = parseFloat(amountPaid);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid payment amount' });
    }

    // Check if payment exceeds remaining balance
    if (paymentAmount > loan.remainingBalance) {
      return res.status(400).json({ 
        message: 'Repayment amount exceeds the remaining balance',
        remainingBalance: loan.remainingBalance
      });
    }

    // Generate a receipt number
    const receiptNumber = `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // Update repayment history
    loan.repaymentHistory.push({ 
      amountPaid: paymentAmount,
      paymentMethod,
      date: Date.now(),
      receiptNumber
    });
    
    // Update remaining balance
    loan.remainingBalance = parseFloat((loan.remainingBalance - paymentAmount).toFixed(2));

    // Mark loan as "Repaid" if fully paid
    if (loan.remainingBalance <= 0) {
      loan.status = 'Repaid';
      loan.remainingBalance = 0; // Ensure we don't have negative balance
      console.log(`Loan ${loanId} has been fully repaid`);
    }

    // Save the updated loan
    await loan.save();
    console.log(`Payment successful: £${paymentAmount} applied to loan ${loanId}. Remaining balance: £${loan.remainingBalance}`);

    // Format response data
    res.status(200).json({ 
      message: 'Payment successful',
      receiptNumber,
      loan: {
        _id: loan._id,
        status: loan.status,
        remainingBalance: loan.remainingBalance,
        receiptNumber
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ 
      message: 'Error processing payment', 
      error: error.message 
    });
  }
};

// Get repayment history
exports.getRepaymentHistory = async (req, res) => {
  const { loanId } = req.params;

  try {
    const loan = await LoanApplication.findById(loanId);

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    res.status(200).json({ repaymentHistory: loan.repaymentHistory });
  } catch (error) {
    console.error('Error fetching repayment history:', error);
    res.status(500).json({ message: 'Error fetching repayment history', error });
  }
};

// Get a specific loan
exports.getLoan = async (req, res) => {
  const { loanId } = req.params;

  try {
    const loan = await LoanApplication.findById(loanId);

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    res.status(200).json(loan);
  } catch (error) {
    console.error('Error fetching loan details:', error);
    res.status(500).json({ message: 'Error fetching loan details', error });
  }
};

// Get all loans for a user
exports.getUserLoans = async (req, res) => {
  const { userId } = req.params;

  try {
    const loans = await LoanApplication.find({ userId });
    res.status(200).json(loans);
  } catch (error) {
    console.error('Error fetching user loans:', error);
    res.status(500).json({ message: 'Error fetching user loans', error });
  }
};

// Get all repayments for a user
exports.getUserRepayments = async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if userId matches the authenticated user or is an admin
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access to repayments' });
    }

    // Find all approved or repaid loans for the user
    const loans = await LoanApplication.find({ 
      userId, 
      status: { $in: ['Approved', 'Repaid'] } 
    });

    console.log(`Found ${loans.length} loans for user ${userId} with status Approved or Repaid`);

    // Format the repayment data for the dashboard
    const repayments = loans.map(loan => {
      // Calculate next payment due date
      let nextPaymentDue = null;
      if (loan.repaymentHistory && loan.repaymentHistory.length > 0) {
        // Get the last payment date
        const lastPaymentDate = new Date(loan.repaymentHistory[loan.repaymentHistory.length - 1].date);
        // Next payment is due 30 days after the last payment
        nextPaymentDue = new Date(lastPaymentDate.setDate(lastPaymentDate.getDate() + 30));
      } else {
        // If no payments have been made yet, calculate from loan approval date or creation date
        const loanDate = loan.updatedAt || loan.createdAt;
        nextPaymentDue = new Date(new Date(loanDate).setDate(new Date(loanDate).getDate() + 30));
      }

      // If the loan is fully repaid, there's no next payment due
      if (loan.status === 'Repaid' || loan.remainingBalance <= 0) {
        nextPaymentDue = null;
      }

      // Calculate interest amount if not provided
      const principalAmount = loan.amount;
      const interestRate = loan.interestRate || 5;
      const interestAmount = loan.totalAmountWithInterest 
        ? loan.totalAmountWithInterest - principalAmount
        : (principalAmount * interestRate / 100);
      const totalAmount = loan.totalAmountWithInterest || (principalAmount + interestAmount);

      return {
        _id: loan._id,
        userId: loan.userId,
        organization: loan.organization,
        institution: loan.organization, // For backward compatibility
        course: loan.course,
        amount: principalAmount,
        interestRate: interestRate,
        interestAmount: interestAmount,
        totalAmount: totalAmount,
        remainingBalance: loan.remainingBalance,
        status: loan.status,
        repaymentHistory: loan.repaymentHistory || [],
        nextPaymentDue
      };
    });

    console.log(`Returning ${repayments.length} repayments for user ${userId}`);
    res.status(200).json(repayments);
  } catch (error) {
    console.error('Error fetching user repayments:', error);
    res.status(500).json({ message: 'Error fetching repayments', error: error.message });
  }
};


