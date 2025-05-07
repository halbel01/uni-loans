const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const dotenv = require('dotenv');

dotenv.config();

// Store OTPs in memory (in production, use a database or Redis)
const otpStore = {};

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate and send OTP
const sendOtp = async (email) => {
  try {
    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, { 
      upperCaseAlphabets: false, 
      specialChars: false 
    });

    // Store OTP
    otpStore[email] = otp;
    
    // OTP expires after 10 minutes
    setTimeout(() => {
      delete otpStore[email];
    }, 10 * 60 * 1000);

    // Send email
    await transporter.sendMail({
      from: `"University Loans System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0062cc;">University Loans Application System</h2>
          <p>Hello,</p>
          <p>Thank you for registering with our University Loans Application System. To complete your registration, please use the verification code below:</p>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <p>Best regards,<br>University Loans Team</p>
        </div>
      `
    });

    return true;
  } catch (error) {
    throw new Error('Failed to send OTP');
  }
};

// Verify OTP
const verifyOtp = (email, otp) => {
  // Check if OTP exists and matches
  if (otpStore[email] && otpStore[email] === otp) {
    // Delete OTP after successful verification
    delete otpStore[email];
    return true;
  }
  return false;
};

// Export the functions
module.exports = { sendOtp, verifyOtp };



