const mongoose = require('mongoose');
const dotenv = require('dotenv');
const LoanApplication = require('./models/LoanApplication');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Find all loan applications
  const applications = await LoanApplication.find();
  console.log(`Found ${applications.length} loan applications`);
  
  // Print details for each loan
  for (const app of applications) {
    console.log('===============================');
    console.log(`Application ID: ${app._id}`);
    console.log(`User ID: ${app.userId}`);
    console.log(`Organization: ${app.organization || 'Not specified'}`);
    console.log(`Amount: ${app.amount}`);
    console.log(`Status: ${app.status}`);
    console.log(`Created: ${app.createdAt}`);
    
    // Find the user
    if (app.userId) {
      try {
        const user = await User.findById(app.userId);
        if (user) {
          console.log(`User: ${user.firstName} ${user.lastName} (${user.email})`);
        } else {
          console.log('User not found');
        }
      } catch (err) {
        console.error('Error finding user:', err);
      }
    }
    
    // Fix the status if it's lowercase 'pending'
    if (app.status === 'pending') {
      console.log('Fixing status from "pending" to "Pending"');
      app.status = 'Pending';
      await app.save();
      console.log('Status fixed');
    }
    
    // Add remaining balance if missing
    if (app.remainingBalance === undefined) {
      console.log('Adding missing remainingBalance field');
      app.remainingBalance = app.amount;
      await app.save();
      console.log('Added remainingBalance field');
    }
  }
  
  console.log('===============================');
  console.log('Verification and fixes completed');
  mongoose.connection.close();
})
.catch(err => {
  console.error('Database connection error:', err);
}); 