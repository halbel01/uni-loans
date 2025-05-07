const FinancialData = require('../models/FinancialData');
const User = require('../models/User');
const UserDocument = require('../models/UserDocument');

// Submit financial data for a loan application
exports.submitFinancialData = async (req, res) => {
  try {
    // Check if user exists
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if financial data already exists for this user
    let financialData = await FinancialData.findOne({ userId: req.body.userId });
    
    if (financialData) {
      // Update existing financial data with all fields from the request
      Object.keys(req.body).forEach(key => {
        if (key !== 'userId') { // Don't update the userId
          financialData[key] = req.body[key];
        }
      });
      
      financialData.submissionDate = Date.now();
      
      await financialData.save();
      return res.status(200).json({ message: 'Financial data updated successfully', financialData });
    }
    
    // Create new financial data with all fields from the request
    financialData = new FinancialData(req.body);
    
    await financialData.save();
    res.status(201).json({ message: 'Financial data submitted successfully', financialData });
  } catch (error) {
    console.error('Error submitting financial data:', error);
    res.status(500).json({ message: 'Error submitting financial data: ' + error.message });
  }
};

// Get financial data for a user
exports.getFinancialData = async (req, res) => {
  const { userId } = req.params;
  
  try {
    const financialData = await FinancialData.findOne({ userId });
    
    if (!financialData) {
      return res.status(404).json({ message: 'Financial data not found for this user' });
    }
    
    res.status(200).json({ financialData });
  } catch (error) {
    console.error('Error retrieving financial data:', error);
    res.status(500).json({ message: 'Error retrieving financial data' });
  }
};

// Upload financial document
exports.uploadDocument = async (req, res) => {
  const { userId } = req.params;
  const documentPath = req.file ? req.file.path : null;
  
  if (!documentPath) {
    return res.status(400).json({ message: 'No document uploaded' });
  }
  
  try {
    console.log(`Uploading financial document for user ${userId}. Path: ${documentPath}`);
    
    // Find or create financial data record
    let financialData = await FinancialData.findOne({ userId });
    
    if (!financialData) {
      console.log(`No financial data found for user ${userId}. Creating new record.`);
      // Create a new financial data record with default values
      financialData = new FinancialData({
        userId,
        annualIncome: 0,
        familyIncome: 0,
        monthlyIncome: 0,
        incomeSource: 'Other',
        outstandingDebts: 0,
        assets: 0,
        documents: []
      });
    }
    
    // Ensure documents array exists
    if (!financialData.documents) {
      financialData.documents = [];
    }
    
    // Add document to financial data
    financialData.documents.push(documentPath);
    await financialData.save();
    console.log(`Document added to financial data. Total documents: ${financialData.documents.length}`);
    
    // Also create a UserDocument entry for consistency
    const userDocument = new UserDocument({
      userId,
      category: 'financial',
      documentType: 'Financial Document',
      path: documentPath
    });
    await userDocument.save();
    console.log(`Document added to UserDocument collection with ID: ${userDocument._id}`);
    
    res.status(200).json({ 
      message: 'Document uploaded successfully', 
      documentPath,
      documents: financialData.documents 
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Error uploading document' });
  }
}; 