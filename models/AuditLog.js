const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String },
  performedByRole: { type: String },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  targetModel: { type: String },
  details: { type: Object },
  ip: { type: String, default: 'unknown' },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
