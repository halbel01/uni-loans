const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { sendOtp, verifyOtp } = require('../utils/otpService');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Request OTP for registration verification
router.post('/request', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'User already exists and is verified' });
    }
    
    // Send OTP
    const sent = await sendOtp(email);
    if (sent) {
      res.status(200).json({ message: 'OTP sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

// Verify OTP and complete registration
router.post('/verify', async (req, res) => {
  const { email, otp } = req.body;
  
  try {
    const isValid = verifyOtp(email, otp);
    
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    // Find the user and mark as verified
    const user = await User.findOne({ email });
    if (user) {
      user.isVerified = true;
    await user.save();

      res.status(200).json({ message: 'Account verified successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

// Login with OTP
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Send OTP for login verification
    const sent = await sendOtp(email);
    if (sent) {
      res.status(200).json({ message: 'OTP sent to your email' });
    } else {
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Verify OTP for login and generate token
router.post('/verify-login', async (req, res) => {
  const { email, otp } = req.body;
  
  try {
    const isValid = verifyOtp(email, otp);
    
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    });
  } catch (error) {
    console.error('Error verifying login OTP:', error);
    res.status(500).json({ message: 'Error verifying login OTP' });
  }
});

module.exports = router;


