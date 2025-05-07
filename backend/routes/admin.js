const express = require('express');
const LoanApplication = require('../models/LoanApplication');
const User = require('../models/User');
const FinancialData = require('../models/FinancialData');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const UserDocument = require('../models/UserDocument');
const path = require('path');
const fs = require('fs');
const loanController = require('../controllers/LoanApplication');

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware, adminMiddleware);

// Debug middleware to log requests
router.use((req, res, next) => {
  console.log(`Admin API Request: ${req.method} ${req.originalUrl}`);
  next();
});

router.get('/users', async (req, res) => {
  try {
    console.log('Fetching all users');
    const users = await User.find().select('-password').lean();
    console.log(`Found ${users.length} users`);
    
    // Format users for the UI and check for documents
    const formattedUsers = await Promise.all(users.map(async user => {
      // Check for documents
      const userDocuments = await UserDocument.find({ userId: user._id }).lean();
      const financialData = await FinancialData.findOne({ userId: user._id }).lean();
      
      let documentCount = userDocuments.length;
      
      // Add financial documents if available
      if (financialData && financialData.documents && financialData.documents.length > 0) {
        documentCount += financialData.documents.length;
      }
      
      return {
        _id: user._id,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        email: user.email,
        role: user.role || 'student',
        isVerified: user.isVerified || false,
        createdAt: user.createdAt || new Date(),
        documents: {
          count: documentCount,
          hasDocuments: documentCount > 0
        }
      };
    }));
    
    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

router.get('/loans', async (req, res) => {
  try {
    console.log('Fetching all loans');
    const loans = await LoanApplication.find().lean();
    console.log(`Found ${loans.length} loan applications`);
    res.status(200).json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ message: 'Error fetching loans' });
  }
});

router.post('/loans/update', async (req, res) => {
  const { loanId, status, adminNotes } = req.body;
  
  try {
    const loan = await LoanApplication.findByIdAndUpdate(
      loanId,
      { 
        status,
        adminNotes,
        updatedAt: Date.now(),
        updatedBy: req.user.userId
      },
      { new: true }
    );
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }
    
    res.status(200).json({ message: `Loan status updated to ${status}`, loan });
  } catch (error) {
    console.error('Error updating loan status:', error);
    res.status(500).json({ message: 'Error updating loan status' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [pendingLoans, approvedLoans, totalUsers, disbursedLoans] = await Promise.all([
      LoanApplication.countDocuments({ status: 'Pending' }),
      LoanApplication.countDocuments({ status: 'Approved' }),
      User.countDocuments(),
      LoanApplication.find({ status: 'Approved' })
    ]);
    
    // Calculate total disbursed amount
    const totalDisbursed = disbursedLoans.reduce((total, loan) => total + loan.amount, 0);
    
    res.status(200).json({
      pendingLoans,
      approvedLoans,
      totalUsers,
      totalDisbursed
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

router.get('/repayments', async (req, res) => {
  try {
    // Find all approved or repaid loans
    const loans = await LoanApplication.find({ 
      status: { $in: ['Approved', 'Repaid'] } 
    });
    
    console.log(`Found ${loans.length} loans with status Approved or Repaid`);
    
    // Fetch user details for each loan
    const loanRepayments = await Promise.all(loans.map(async (loan) => {
      const user = await User.findById(loan.userId).select('firstName lastName');
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      
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
        userName,
        organization: loan.organization,
        amount: principalAmount,
        interestRate: interestRate,
        interestAmount: interestAmount,
        totalAmountWithInterest: totalAmount,
        remainingBalance: loan.remainingBalance,
        status: loan.status,
        repaymentHistory: loan.repaymentHistory || [],
        nextPaymentDue: calculateNextPaymentDue(loan)
      };
    }));
    
    console.log(`Returning ${loanRepayments.length} repayments`);
    res.status(200).json(loanRepayments);
  } catch (error) {
    console.error('Error fetching repayments:', error);
    res.status(500).json({ message: 'Error fetching repayments' });
  }
});

router.get('/loans/:loanId', async (req, res) => {
  const { loanId } = req.params;
  
  try {
    const loan = await LoanApplication.findById(loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }
    
    // Get related data
    const user = await User.findById(loan.userId).select('-password');
    const financialData = await FinancialData.findOne({ userId: loan.userId });
    
    // Get documents
    const documents = [];
    
    if (financialData && financialData.documents && financialData.documents.length > 0) {
      financialData.documents.forEach(docPath => {
        documents.push({
          type: 'financial',
          path: docPath
        });
      });
    }
    
    res.status(200).json({
      loan,
      user,
      financialData,
      documents
    });
  } catch (error) {
    console.error('Error fetching loan details:', error);
    res.status(500).json({ message: 'Error fetching loan details' });
  }
});

router.post('/verify-documents', async (req, res) => {
  const { loanId, verificationStatus, verificationNotes } = req.body;
  
  try {
    const loan = await LoanApplication.findById(loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found' });
    }
    
    // Update loan with verification details
    loan.documentVerification = {
      status: verificationStatus,
      verifiedBy: req.user.userId,
      verificationDate: Date.now(),
      notes: verificationNotes
    };
    
    // If documents are verified, update the overall status as needed
    if (verificationStatus === 'verified' && loan.status === 'Pending') {
      loan.status = 'Pending Review'; // Indicate it's ready for final review
    } else if (verificationStatus === 'rejected') {
      loan.status = 'Rejected'; // Reject the application if documents are insufficient
    }
    
    await loan.save();
    
    res.status(200).json({ 
      message: 'Document verification completed successfully',
      status: loan.status
    });
  } catch (error) {
    console.error('Error verifying documents:', error);
    res.status(500).json({ message: 'Error verifying documents' });
  }
});

function calculateNextPaymentDue(loan) {
  if (loan.repaymentHistory && loan.repaymentHistory.length > 0) {
    // Get the last payment date
    const lastPaymentDate = new Date(loan.repaymentHistory[loan.repaymentHistory.length - 1].date);
    // Next payment is due 30 days after the last payment
    return new Date(lastPaymentDate.setDate(lastPaymentDate.getDate() + 30));
  } else {
    // If no payments have been made yet, calculate from loan creation date
    const loanDate = new Date(loan.createdAt);
    return new Date(loanDate.setDate(loanDate.getDate() + 30));
  }
}

// Create a new user (for creating admin accounts)
router.post('/users', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;
    console.log(`Creating new user with email: ${email}, role: ${role}`);
    
    // Split fullName into firstName and lastName
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Check if user with the same email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create a new user
    const user = new User({
      firstName,
      lastName,
      email,
      password, // Will be hashed by the pre-save hook in the model
      isVerified: true, // Admin-created users are verified by default
      role: role === 'admin' ? 'admin' : 'student' // Ensure role is valid
    });
    
    await user.save();
    console.log(`User created successfully with ID: ${user._id}`);
    
    res.status(201).json({ 
      message: 'User created successfully',
      userId: user._id
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Delete a user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Deleting user with ID: ${userId}`);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log(`No user found with ID: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    console.log(`User ${userId} deleted successfully`);
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Get dashboard overview data
router.get('/dashboard-overview', async (req, res) => {
  try {
    console.log('Fetching admin dashboard overview');
    
    // Get counts for dashboard statistics
    let totalApplications = 0;
    let pendingApplications = 0;
    let approvedApplications = 0;
    let rejectedApplications = 0;
    
    try {
      totalApplications = await LoanApplication.countDocuments();
      pendingApplications = await LoanApplication.countDocuments({ status: 'Pending' });
      approvedApplications = await LoanApplication.countDocuments({ status: 'Approved' });
      rejectedApplications = await LoanApplication.countDocuments({ status: 'Rejected' });
    } catch (err) {
      console.error('Error counting loan applications:', err);
    }
    
    console.log(`Statistics: Total=${totalApplications}, Pending=${pendingApplications}, Approved=${approvedApplications}, Rejected=${rejectedApplications}`);
    
    // Get recent applications
    let recentApplications = [];
    try {
      recentApplications = await LoanApplication.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      console.log(`Found ${recentApplications.length} recent applications`);
    } catch (err) {
      console.error('Error fetching recent applications:', err);
    }
    
    // Get user details for applications
    const enrichedApplications = [];
    for (const app of recentApplications) {
      try {
        let user = null;
        if (app.userId) {
          user = await User.findById(app.userId).select('firstName lastName').lean();
        }
        
        enrichedApplications.push({
          ...app,
          applicantName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown'
        });
      } catch (err) {
        console.error(`Error processing application ${app._id}:`, err);
        // Still include the application even if user details can't be fetched
        enrichedApplications.push({
          ...app,
          applicantName: 'Unknown'
        });
      }
    }
    
    // For now, just return empty repayments to get the dashboard working
    const recentRepayments = [];
    
    console.log('Dashboard overview data prepared successfully');
    
    res.status(200).json({
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      recentApplications: enrichedApplications,
      recentRepayments
    });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({ 
      message: 'Error getting dashboard overview',
      error: error.message
    });
  }
});

// Add the missing loan-applications endpoint with filtering
router.get('/loan-applications', async (req, res) => {
  try {
    console.log('Fetching loan applications');
    const { status } = req.query;
    
    // Define the query filter
    let filter = {};
    if (status && status !== 'all') {
      const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
      filter.status = formattedStatus;
    }
    
    // Find all loan applications, sorted by creation date (newest first)
    const applications = await LoanApplication.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${applications.length} loan applications`);
    
    // Enrich applications with user data
    const enrichedApplications = [];
    for (const app of applications) {
      console.log(`Processing application ${app._id} for user ${app.userId}`);
      let user = null;
      try {
        if (app.userId) {
          user = await User.findById(app.userId).select('firstName lastName email').lean();
          console.log(`Found user: ${user ? user._id : 'None'}`);
        }
      } catch (err) {
        console.error(`Error finding user for loan ${app._id}:`, err);
      }
      
      enrichedApplications.push({
        ...app,
        applicantName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
        applicantEmail: user ? user.email : 'Unknown'
      });
    }
    
    // Return the applications
    console.log(`Returning ${enrichedApplications.length} enriched applications`);
    res.status(200).json(enrichedApplications);
  } catch (error) {
    console.error('Error fetching loan applications:', error);
    res.status(500).json({ 
      message: 'Error fetching loan applications',
      error: error.message 
    });
  }
});

// Add route to get specific loan application with all details
router.get('/loan-application/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    console.log(`Fetching details for loan application ${applicationId}`);
    
    const application = await LoanApplication.findById(applicationId).lean();
    if (!application) {
      console.log(`No loan application found with ID: ${applicationId}`);
      return res.status(404).json({ message: 'Loan application not found' });
    }
    
    console.log(`Found loan application with ID: ${application._id}`);
    
    // Get user details
    let user = null;
    try {
      if (application.userId) {
        user = await User.findById(application.userId).select('-password').lean();
        console.log(`Found user: ${user ? user._id : 'None'}`);
      }
    } catch (err) {
      console.error('Error finding user:', err);
    }
    
    // Get financial data
    let financialData = null;
    try {
      if (application.userId) {
        financialData = await FinancialData.findOne({ userId: application.userId }).lean();
        console.log(`Found financial data: ${financialData ? 'Yes' : 'No'}`);
      }
    } catch (err) {
      console.error('Error finding financial data:', err);
    }
    
    // Get all documents
    let documents = [];
    try {
      if (application.userId) {
        // Get documents from UserDocument collection
        const userDocuments = await UserDocument.find({ userId: application.userId }).lean();
        console.log(`Found ${userDocuments.length} documents in UserDocument collection`);
        
        documents = userDocuments;
        
        // Add documents from financial data if available
        if (financialData && financialData.documents && financialData.documents.length > 0) {
          financialData.documents.forEach(doc => {
            if (typeof doc === 'string') {
              documents.push({
                category: 'financial',
                documentType: 'Financial Record',
                path: doc,
                uploadDate: financialData.submissionDate || financialData.updatedAt || new Date()
              });
            } else {
              documents.push(doc);
            }
          });
        }
      }
    } catch (err) {
      console.error('Error finding documents:', err);
    }
    
    // Combine application with user and financial data
    const enrichedApplication = {
      ...application,
      applicantName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
      applicantEmail: user ? user.email : 'Unknown',
      phoneNumber: user ? user.phone : 'Not provided',
      // Include financial data if available
      ...(financialData && {
        incomeSource: financialData.incomeSource,
        monthlyIncome: financialData.monthlyIncome,
        monthlyExpenses: financialData.monthlyExpenses,
        existingLoans: financialData.existingLoans
      }),
      // Add documents
      documents: documents
    };
    
    console.log('Returning enriched application with documents');
    res.status(200).json(enrichedApplication);
  } catch (error) {
    console.error('Error fetching loan application details:', error);
    res.status(500).json({ 
      message: 'Error fetching loan application details',
      error: error.message
    });
  }
});

// Route to update loan application status
router.post('/loan-application/:applicationId/update-status', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, adminNotes } = req.body;
    
    console.log(`Updating status for loan application ${applicationId} to ${status}`);
    
    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      console.log(`No loan application found with ID: ${applicationId}`);
      return res.status(404).json({ message: 'Loan application not found' });
    }
    
    // Update application
    application.status = status;
    if (adminNotes) {
      application.adminNotes = adminNotes;
    }
    
    // If the loan is being approved, ensure no interest is applied (interest-free)
    if (status === 'Approved') {
      // Set interest rate to 0 (interest-free)
      application.interestRate = 0;
      
      // Total amount equals principal amount (no interest)
      application.totalAmountWithInterest = application.amount;
      
      // Set remaining balance to principal amount
      application.remainingBalance = application.amount;
      
      console.log(`Loan approved with: Principal: £${application.amount}, Interest Rate: ${application.interestRate}% (interest-free), Total: £${application.totalAmountWithInterest}, Remaining: £${application.remainingBalance}`);
    }
    
    application.updatedAt = new Date();
    application.updatedBy = req.user.userId;
    
    await application.save();
    console.log(`Updated loan application ${applicationId} status to ${status}`);
    
    res.status(200).json({
      message: `Loan application status updated to ${status}`,
      application
    });
  } catch (error) {
    console.error('Error updating loan application status:', error);
    res.status(500).json({ 
      message: 'Error updating loan application status',
      error: error.message
    });
  }
});

// Add a new route to get all user documents
router.get('/user-documents/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Admin fetching documents for user: ${userId}`);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get documents from UserDocument collection
    const userDocuments = await UserDocument.find({ userId }).lean();
    console.log(`Found ${userDocuments.length} documents in UserDocument collection`);
    
    // Get documents from FinancialData collection
    const financialData = await FinancialData.findOne({ userId }).lean();
    const financialDocuments = [];
    
    if (financialData && financialData.documents && financialData.documents.length > 0) {
      console.log(`Found ${financialData.documents.length} documents in FinancialData`);
      
      financialData.documents.forEach(doc => {
        if (typeof doc === 'string') {
          financialDocuments.push({
            type: 'financial',
            category: 'financial',
            documentType: 'Financial Record',
            path: doc,
            uploadDate: financialData.submissionDate || financialData.updatedAt || new Date()
          });
        } else {
          financialDocuments.push({
            ...doc,
            type: 'financial',
            category: 'financial'
          });
        }
      });
    }
    
    // Combine all documents
    const allDocuments = [
      ...userDocuments,
      ...financialDocuments
    ];
    
    console.log(`Returning ${allDocuments.length} total documents for user ${userId}`);
    
    res.status(200).json({
      user: {
        _id: user._id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email
      },
      documents: allDocuments
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({ message: 'Error fetching user documents' });
  }
});

// Add a route to get document status for a user
router.get('/user-document-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Admin checking document status for user: ${userId}`);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check for documents in UserDocument collection
    const userDocuments = await UserDocument.find({ userId });
    console.log(`Found ${userDocuments.length} user documents`);
    
    const identityDocs = userDocuments.filter(doc => doc.category === 'identity');
    const financialDocsInUserDocs = userDocuments.filter(doc => doc.category === 'financial');
    
    console.log(`Found ${identityDocs.length} identity documents`);
    console.log(`Found ${financialDocsInUserDocs.length} financial documents in UserDocument`);
    
    // Also check FinancialData collection
    const financialData = await FinancialData.findOne({ userId });
    console.log(`Financial data found: ${financialData ? 'Yes' : 'No'}`);
    
    // Count financial documents from both sources
    let financialDocs = [];
    
    // Add documents from UserDocument collection
    if (financialDocsInUserDocs.length > 0) {
      financialDocs = financialDocsInUserDocs;
    }
    
    // Add documents from FinancialData collection
    if (financialData && financialData.documents && financialData.documents.length > 0) {
      // If we only have paths in the FinancialData documents array, convert them to objects
      const docsFromFinancialData = financialData.documents.map(doc => {
        if (typeof doc === 'string') {
          return {
            path: doc,
            category: 'financial'
          };
        }
        return doc;
      });
      
      // Add any documents not already in the list
      financialDocs = [...financialDocs, ...docsFromFinancialData];
    }
    
    // Remove duplicates by path
    const uniquePaths = new Set();
    financialDocs = financialDocs.filter(doc => {
      const path = typeof doc === 'string' ? doc : doc.path;
      if (uniquePaths.has(path)) return false;
      uniquePaths.add(path);
      return true;
    });
    
    console.log(`Found ${financialDocs.length} total financial documents`);
    
    // Force convert to boolean to ensure correct evaluation
    const hasIdentityDocs = identityDocs.length > 0;
    const hasFinancialDocs = financialDocs.length > 0;
    const hasFinancialDataSubmission = financialData ? true : false;
    
    const status = {
      user: {
        _id: user._id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email
      },
      documentStatus: {
        hasIdentityDocuments: hasIdentityDocs,
        hasFinancialDocuments: hasFinancialDocs, 
        hasFinancialData: hasFinancialDataSubmission,
        canApplyForLoan: hasIdentityDocs && hasFinancialDocs && hasFinancialDataSubmission,
        totalDocuments: {
          identity: identityDocs.length,
          financial: financialDocs.length
        }
      }
    };
    
    console.log('Document status:', JSON.stringify(status, null, 2));
    
    res.status(200).json(status);
  } catch (error) {
    console.error('Error checking document status:', error);
    res.status(500).json({ message: 'Error checking document status' });
  }
});

// Add download document route for admin - fixed version with no variable conflicts
// Make sure these imports are at the top of the file and aren't duplicated
// const path = require('path');
// const fs = require('fs');

// Download document as admin
router.get('/download-document/:documentPath(*)', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { documentPath } = req.params;
    console.log('Admin download requested for:', documentPath);
    
    // Clean up the path to ensure it's just the relative path within uploads
    let cleanPath = documentPath;
    
    // Remove any absolute path components
    const uploadsDirIndex = cleanPath.indexOf('uploads');
    if (uploadsDirIndex !== -1) {
      cleanPath = cleanPath.substring(uploadsDirIndex + 8); // 'uploads/'.length = 8
    }
    
    // Remove any additional directory traversal
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    
    console.log('Cleaned path:', cleanPath);
    
    // Construct safe path relative to uploads directory
    const fullPath = path.join(__dirname, '..', 'uploads', cleanPath);
    console.log('Full path:', fullPath);
    
    // Verify file exists
    if (!fs.existsSync(fullPath)) {
      console.error('File not found:', fullPath);
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Get filename for the download
    const filename = path.basename(fullPath);
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Set appropriate content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream'; // default
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    }
    res.setHeader('Content-Type', contentType);
    
    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });
    
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error in download-document route:', error);
    res.status(500).json({ message: 'Error downloading document' });
  }
});

// Make a repayment
router.post('/repay', loanController.makeRepayment);

// Get repayment history
router.get('/repayment-history/:loanId', loanController.getRepaymentHistory);

module.exports = router;


