const mongoose = require('mongoose');

const AuditSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  details: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes
AuditSchema.index({ user: 1 });
AuditSchema.index({ action: 1 });
AuditSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Audit', AuditSchema);
