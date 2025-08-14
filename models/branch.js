const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add index for efficient lookup
BranchSchema.index({ name: 1 });

module.exports = mongoose.model('Branch', BranchSchema);
