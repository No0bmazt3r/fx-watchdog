const mongoose = require('mongoose');

const highestRateSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    batch: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    rate: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

// Create a compound index to ensure that each currency has only one highest rate per batch per day
highestRateSchema.index({ date: 1, batch: 1, currency: 1 }, { unique: true });

const HighestRate = mongoose.model('HighestRate', highestRateSchema);

module.exports = HighestRate;
