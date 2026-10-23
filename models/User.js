const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['student', 'admin', 'franchise', 'branch', 'teacher'], default: 'student' },
  isSuperAdmin: { type: Boolean, default: false },
  phone: { type: String },
  address: { type: String },
  photo: { type: String },
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  // Student fields
  rollNumber: { type: String, unique: true, sparse: true },
  enrollmentNumber: { type: String, unique: true, sparse: true },
  registrationNumber: { type: String, unique: true, sparse: true },
  formNo: { type: String },
  fatherName: { type: String },
  dob: { type: Date },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseName: { type: String },
  batch: { type: String },
  admissionDate: { type: Date },
  attendance: { type: Number, default: 0 },
  totalClasses: { type: Number, default: 0 },
  videoProgress: [{ videoId: String, watchedSeconds: Number, totalSeconds: Number }],
  // Franchise fields
  franchiseCenter: { type: String },
  franchiseCity: { type: String },
  franchiseCode: { type: String },
  franchisePhone: { type: String },
  franchiseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Branch fields
  branchName: { type: String },
  branchCity: { type: String },
  branchCode: { type: String },
  branchAddress: { type: String },
  branchPhone: { type: String },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalStudents: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  notes: { type: String },
  renewalDate: { type: Date },
  approvedAt: { type: Date },
  // OTP
  otp: { type: String },
  otpExpiry: { type: Date },
  isVerified: { type: Boolean, default: false },
  // Security, Sessions & Suspicious Login Tracking
  tokenVersion: { type: Number, default: 0 },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  lastLogin: { type: Date },
  lastLoginIp: { type: String },
  lastLoginUserAgent: { type: String },
  suspiciousLoginsCount: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (p) {
  return await bcrypt.compare(p, this.password);
};

module.exports = mongoose.model('User', userSchema);
