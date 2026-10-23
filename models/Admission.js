const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    fatherName: { type: String },
    batch: { type: String },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    qualification: { type: String, required: true },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    franchise: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String },
    enrollmentId: { type: String, unique: true, sparse: true },
    rollNumber: { type: String },
    enrollmentNumber: { type: String },
    studentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    formNo: { type: String },
    session: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Pending Approval', 'Verified', 'Approved', 'Rejected'],
      default: 'Pending Approval',
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    photo: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admission', admissionSchema);
