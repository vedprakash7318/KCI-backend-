const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  refreshTokenHash: {
    type: String,
    required: true,
    index: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  ip: {
    type: String,
    default: 'unknown',
  },
  userAgent: {
    type: String,
    default: 'unknown',
  },
  device: {
    type: String,
    default: 'Browser',
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true,
  },
  revokedReason: {
    type: String,
    default: null,
  },
  lastUsedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);

