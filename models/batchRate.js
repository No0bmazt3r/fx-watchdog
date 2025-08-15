const mongoose = require('mongoose');

const batchRateSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  batch: { type: String, required: true }, // Morning, Afternoon
  currency: { type: String, required: true },
  highestRate: { type: Number, required: true },
  highestBranch: { type: String, required: true },
  lowestRate: { type: Number, required: true },
  lowestBranch: { type: String, required: true },
  totalBranches: { type: Number, required: true },
  submittedBranches: { type: Number, required: true },
  isComplete: { type: Boolean, required: true, default: false },
  branches: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

batchRateSchema.index({ date: 1, batch: 1, currency: 1 }, { unique: true });

const BatchRate = mongoose.model('BatchRate', batchRateSchema);

module.exports = BatchRate;
