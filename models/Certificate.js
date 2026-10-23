const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    rollNumber: { type: String, index: true },
    enrollmentNumber: { type: String, index: true },
    formNo: { type: String, index: true },
    studentName: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    courseName: { type: String, required: true },
    certificateNumber: { type: String, required: true, unique: true },
    issueDate: { type: Date, required: true },
    grade: { type: String },
    certificateFile: { type: String }, // PNG URL
    isValid: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false }, // published/visible to student
    isPublished: { type: Boolean, default: false }, // alias for isApproved
    uploadedByAdmin: { type: Boolean, default: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedByRole: { type: String, enum: ['admin', 'branch'], default: 'admin' },
    batch: { type: String },
    session: { type: String },
  },
  { timestamps: true }
);

// Compound indexes
certificateSchema.index({ branchId: 1, isApproved: 1 });
certificateSchema.index({ student: 1, isApproved: 1 });

// Keep isPublished in sync with isApproved
certificateSchema.pre('save', function(next) {
  this.isPublished = this.isApproved;
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
