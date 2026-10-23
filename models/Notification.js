const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  message:        { type: String, required: true },
  type:           { type: String, enum: ['exam', 'result', 'course', 'general', 'admission', 'fee', 'holiday', 'urgent'], default: 'general' },
  targetRole:     { type: String, enum: ['all', 'student', 'franchise', 'teacher', 'specific'], default: 'all' },
  // If targetRole === 'specific', only these student IDs will see it
  targetStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  branchId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive:       { type: Boolean, default: true },
  image:          { type: String },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  readBy:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
