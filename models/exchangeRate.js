
const mongoose = require('mongoose');

const ExchangeRateSchema = new mongoose.Schema({
  upload: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload',
    required: true
  },
  image_index: {
    type: Number,
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
  rates: {
    type: Map,
    of: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ExchangeRate', ExchangeRateSchema);
