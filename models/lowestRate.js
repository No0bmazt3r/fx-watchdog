const mongoose = require('mongoose');

const lowestRateSchema = new mongoose.Schema(
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

// Create a compound index to ensure that each currency has only one lowest rate per batch per day
lowestRateSchema.index({ date: 1, batch: 1, currency: 1 }, { unique: true });

const LowestRate = mongoose.model('LowestRate', lowestRateSchema);

module.exports = LowestRate;
