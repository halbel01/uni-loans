const express = require('express');
const router = express.Router();
const userController = require('../controllers/User');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Register a new user
router.post('/register', userController.registerUser);

// Login user
router.post('/login', userController.loginUser);

// Get user profile (protected route)
router.get('/profile', authMiddleware, userController.getUserProfile);

// Get specific user profile (admin only)
router.get('/profile/:userId', authMiddleware, userController.getUserProfile);

// Update user profile (protected route)
router.put('/profile', authMiddleware, userController.updateUserProfile);

// Verify user account
router.post('/verify/:userId', userController.verifyUser);

// Check if user has uploaded required documents
router.get('/document-status/:userId', authMiddleware, userController.checkDocumentStatus);

// Set up storage for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const category = req.body.category || 'identity';
    let uploadPath;
    
    if (category === 'financial') {
      uploadPath = path.join(__dirname, '../uploads/financial-documents/');
    } else if (category === 'address') {
      uploadPath = path.join(__dirname, '../uploads/address-documents/');
    } else {
      uploadPath = path.join(__dirname, '../uploads/identity-documents/');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
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

// Upload document
router.post('/upload-document', authMiddleware, upload.single('document'), userController.uploadDocument);

// Get user documents
router.get('/documents/:userId', authMiddleware, userController.getUserDocuments);

// Delete document
router.delete('/documents/:documentId', authMiddleware, userController.deleteDocument);

// Download document
router.get('/download-document/:documentPath(*)', authMiddleware, userController.downloadDocument);

module.exports = router; 