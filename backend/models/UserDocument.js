// Create a new file: backend/models/UserDocument.js
const mongoose = require('mongoose');

const userDocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['identity', 'address', 'financial'],
    required: true
  },
  documentType: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

const UserDocument = mongoose.model('UserDocument', userDocumentSchema);

module.exports = UserDocument;