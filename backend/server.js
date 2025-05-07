// server.js
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const financialDocsDir = path.join(uploadsDir, 'financial-documents');
const identityDocsDir = path.join(uploadsDir, 'identity-documents');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  fs.mkdirSync(financialDocsDir);
  fs.mkdirSync(identityDocsDir);
}

// Make uploads directory accessible
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes correctly
const adminRoutes = require('./routes/admin');
const loanRoutes = require('./routes/loan');
const otpRoutes = require('./routes/otp');
const userRoutes = require('./routes/user');
const financialRoutes = require('./routes/financial');

// Debug the imported routes
console.log('adminRoutes type:', typeof adminRoutes);
console.log('loanRoutes type:', typeof loanRoutes);
console.log('otpRoutes type:', typeof otpRoutes);
console.log('userRoutes type:', typeof userRoutes);
console.log('financialRoutes type:', typeof financialRoutes);

// Use routes
app.use('/admin', adminRoutes);
app.use('/loan', loanRoutes);
app.use('/otp', otpRoutes);
app.use('/user', userRoutes);
app.use('/financial', financialRoutes);

// Add this after registering all routes
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(r.route.methods, r.route.path);
  } else if(r.name === 'router') {
    r.handle.stack.forEach(function(route){
      if(route.route) {
        console.log(route.route.methods, r.regexp, route.route.path);
      }
    });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Other routes...

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Define upload directories
const uploadDirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads/identity-documents'),
  path.join(__dirname, 'uploads/financial-documents'),
  path.join(__dirname, 'uploads/address-documents')
];

// Create directories if they don't exist
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } catch (err) {
      console.error(`Error creating directory ${dir}:`, err);
    }
  }
});

// Log the current working directory to help with debugging
console.log('Current working directory:', process.cwd());
console.log('Server uploads directory:', path.join(__dirname, 'uploads'));