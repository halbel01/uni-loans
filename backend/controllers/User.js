const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const otpService = require('../utils/otpService');
const UserDocument = require('../models/UserDocument');
const FinancialData = require('../models/FinancialData');
const path = require('path');
const fs = require('fs');

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    
    // Check if user with the same email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create a new user
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password, // Will be hashed by the pre-save hook in the model
      isVerified: false,
      role: 'student'
    });
    
    await user.save();
    
    // Send OTP for verification
    await otpService.sendOtp(email);
    
    res.status(201).json({ 
      message: 'Registration successful! Please check your email for the verification code.',
      userId: user._id
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      token,
      userId: user._id,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Error logging in user' });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    res.status(500).json({ message: 'Error retrieving user profile' });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  const { firstName, lastName, phone } = req.body;
  const userId = req.params.userId || req.user.userId;
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    
    await user.save();
    
    res.status(200).json({ 
      message: 'User profile updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error updating user profile' });
  }
};

// Verify user account
exports.verifyUser = async (req, res) => {
  const { userId } = req.params;
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isVerified = true;
    await user.save();
    
    res.status(200).json({ message: 'User verified successfully' });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ message: 'Error verifying user' });
  }
};

// Check if user has uploaded required documents
exports.checkDocumentStatus = async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Ensure the requesting user can only access their own data
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access to document status' });
    }
    
    // Get user documents from appropriate collections
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`Checking documents for user: ${userId}`);
    
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
      hasIdentityDocuments: hasIdentityDocs,
      hasFinancialDocuments: hasFinancialDocs, 
      hasFinancialData: hasFinancialDataSubmission,
      canApplyForLoan: hasIdentityDocs && hasFinancialDocs && hasFinancialDataSubmission,
      totalDocuments: {
        identity: identityDocs.length,
        financial: financialDocs.length
      }
    };
    
    console.log('Document status:', JSON.stringify(status, null, 2));
    
    res.status(200).json(status);
  } catch (error) {
    console.error('Error checking document status:', error);
    res.status(500).json({ message: 'Error checking document status' });
  }
};

// Upload document
exports.uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  try {
    const { userId, category, documentType } = req.body;
    
    // Ensure the upload directory exists
    const uploadDir = path.dirname(req.file.path);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create new document record
    const document = new UserDocument({
      userId,
      category: category || 'identity',
      documentType: documentType || 'Other',
      path: req.file.path
    });
    
    await document.save();
    
    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Error uploading document' });
  }
};

// Get user documents
exports.getUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure the requesting user can only access their own documents
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access to documents' });
    }
    
    const documents = await UserDocument.find({ userId });
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Error fetching documents' });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await UserDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Ensure the requesting user can only delete their own documents
    if (document.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized document deletion' });
    }
    
    await UserDocument.findByIdAndDelete(documentId);
    
    // Delete the actual file (optional, depends on your storage strategy)
    // fs.unlinkSync(document.path);
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Error deleting document' });
  }
};

// Download document
exports.downloadDocument = async (req, res) => {
  try {
    const { documentPath } = req.params;
    
    // Ensure the path is safe and within the uploads directory
    const decodedPath = decodeURIComponent(documentPath);
    const fullPath = path.join(__dirname, '..', 'uploads', decodedPath);
    const normalizedPath = path.normalize(fullPath);
    
    // Prevent directory traversal attacks
    if (!normalizedPath.startsWith(path.join(__dirname, '..', 'uploads'))) {
      return res.status(403).json({ message: 'Access denied: Invalid document path' });
    }
    
    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Extract the original filename from the path
    const filename = path.basename(normalizedPath);
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send the file
    const fileStream = fs.createReadStream(normalizedPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Error downloading document' });
  }
}; 