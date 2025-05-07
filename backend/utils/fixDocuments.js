const mongoose = require('mongoose');
const FinancialData = require('../models/FinancialData');
const UserDocument = require('../models/UserDocument');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected for document fix');
    fixDocuments();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function fixDocuments() {
  try {
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);
    
    for (const user of users) {
      console.log(`Processing user: ${user._id}`);
      
      // Get all user documents
      const userDocuments = await UserDocument.find({ userId: user._id });
      console.log(`Found ${userDocuments.length} documents for user ${user._id}`);
      
      // Get financial data
      let financialData = await FinancialData.findOne({ userId: user._id });
      
      // Create financial data if it doesn't exist
      if (!financialData) {
        console.log(`Creating new financial data for user ${user._id}`);
        financialData = new FinancialData({
          userId: user._id,
          annualIncome: 0,
          familyIncome: 0,
          monthlyIncome: 0,
          incomeSource: 'Other',
          outstandingDebts: 0,
          assets: 0,
          documents: []
        });
      }
      
      // Make sure documents array exists
      if (!financialData.documents) {
        financialData.documents = [];
      }
      
      // Get financial documents from UserDocument collection
      const financialDocsInUserDocs = userDocuments.filter(doc => doc.category === 'financial');
      console.log(`Found ${financialDocsInUserDocs.length} financial documents in UserDocument`);
      
      // Add missing documents to financial data
      for (const doc of financialDocsInUserDocs) {
        if (!financialData.documents.includes(doc.path)) {
          console.log(`Adding document ${doc.path} to financial data`);
          financialData.documents.push(doc.path);
        }
      }
      
      // Save financial data
      await financialData.save();
      console.log(`Saved financial data with ${financialData.documents.length} documents`);
      
      // Add financial data documents to UserDocument if they're not already there
      for (const docPath of financialData.documents) {
        const existingDoc = await UserDocument.findOne({ 
          userId: user._id, 
          path: docPath 
        });
        
        if (!existingDoc) {
          console.log(`Adding document ${docPath} to UserDocument collection`);
          const newDoc = new UserDocument({
            userId: user._id,
            category: 'financial',
            documentType: 'Financial Document',
            path: docPath
          });
          await newDoc.save();
        }
      }
    }
    
    console.log('Document fix complete');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing documents:', error);
    process.exit(1);
  }
} 