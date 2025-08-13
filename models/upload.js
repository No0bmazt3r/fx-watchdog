
const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: false
  },
  imageData: {
    type: String, // Storing image as a Base64 string
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  extraDetails: {
    type: [String],
    required: false
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true
  },
  adminMessage: {
    type: String,
    required: false // Optional message from admin
  },
  adminActionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // User who performed the admin action
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Upload', UploadSchema);
