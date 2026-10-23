const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  fatherName: { type: String },
  courseName: { type: String },
  branch: { type: String },
  batch: { type: String },
  rollNumber: { type: String, index: true },
  enrollmentNumber: { type: String, index: true },
  formNo: { type: String, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  examDate: { type: Date },
  uploadDate: { type: Date },
  resultFile: { type: String }, // PNG URL (Cloudinary or local)
  resultStatus: { type: String, enum: ['Pass', 'Fail', 'Pending'], default: 'Pending' },
  isApproved: { type: Boolean, default: false }, // published/visible to student
  isPublished: { type: Boolean, default: false }, // alias for isApproved
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedByRole: { type: String, enum: ['admin', 'branch'], default: 'branch' },
  // Legacy subject-based result fields
  subjects: [{ name: String, maxMarks: Number, obtainedMarks: Number }],
  totalMarks: { type: Number },
  obtainedMarks: { type: Number },
  percentage: { type: Number },
  grade: { type: String },
  status: { type: String, enum: ['Pass', 'Fail'], default: 'Pass' },
}, { timestamps: true });

// Compound indexes
ResultSchema.index({ rollNumber: 1, courseName: 1 });
ResultSchema.index({ formNo: 1, courseName: 1 });
ResultSchema.index({ branchId: 1, isApproved: 1 });
ResultSchema.index({ studentId: 1, isApproved: 1 });

// Keep isPublished in sync with isApproved
ResultSchema.pre('save', function(next) {
  this.isPublished = this.isApproved;
  next();
});

module.exports = mongoose.model('Result', ResultSchema);
