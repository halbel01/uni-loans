const express = require('express');
const router = express.Router();
const loanController = require('../controllers/LoanApplication');
const authMiddleware = require('../middleware/auth');

// Creating a new router instance to define routes

// Apply authentication middleware to protected routes
router.use(authMiddleware);

// Submit a loan application
router.post('/apply', loanController.submitLoanApplication);

// Review a loan application status (admin only)
router.post('/review', loanController.reviewLoanApplication);

// Make a repayment
router.post('/repay', loanController.makeRepayment);

// Get repayment history
router.get('/repayment-history/:loanId', loanController.getRepaymentHistory);

// Get all repayments for a user
router.get('/repayments/:userId', loanController.getUserRepayments);

// Get all loans for a user
router.get('/user/:userId', loanController.getUserLoans);

// Get a specific loan - this more generic route should come last
router.get('/:loanId', loanController.getLoan);

module.exports = router;

