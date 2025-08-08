
const mongoose = require('mongoose');

const ExchangeRateSchema = new mongoose.Schema({
  upload: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload',
    required: true
  },
  date: {
    type: String
  },
  time: {
    type: String
  },
  branch: {
    type: String
  },
  currency: {
    type: String,
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ExchangeRate', ExchangeRateSchema);
