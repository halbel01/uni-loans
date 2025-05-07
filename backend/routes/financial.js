const express = require('express');
const router = express.Router();
const financialController = require('../controllers/FinancialData');
const multer = require('multer');
const path = require('path');

// Set up storage for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/financial-documents/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .jpeg, .jpg, .png, and .pdf formats are allowed'));
    }
  }
});

// Submit financial data
router.post('/submit', financialController.submitFinancialData);

// Get financial data for a specific user
router.get('/:userId', financialController.getFinancialData);

// Upload financial document
router.post('/document/:userId', upload.single('document'), financialController.uploadDocument);

module.exports = router; 