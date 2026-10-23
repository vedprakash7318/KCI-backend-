const mongoose = require('mongoose');

const examFormSchema = new mongoose.Schema({
  // Personal Info
  studentName:      { type: String, required: true },
  fatherName:       { type: String, required: true },
  motherName:       { type: String },
  dob:              { type: String, required: true },
  gender:           { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  category:         { type: String, enum: ['General', 'OBC', 'SC', 'ST'], default: 'General' },

  // Academic Info
  enrollmentNumber: { type: String, required: true },
  formNo:           { type: String },
  course:           { type: String, required: true },
  batch:            { type: String, required: true },
  session:          { type: String },
  qualification:    { type: String },
  subjects:         { type: String },

  // Contact Info
  phone:            { type: String, required: true },
  email:            { type: String, required: true },
  address:          { type: String },

  // Photos & Signatures
  studentPhoto:     { type: String },
  studentSignature: { type: String },

  // Exam Info
  examCenter:       { type: String },
  examDate:         { type: String },
  reportingTime:    { type: String },
  examType:         { type: String, default: 'Regular' },

  // QR Security & Serial
  verificationToken:{ type: String, unique: true, sparse: true },
  admitCardSerial:  { type: String },

  // Payment
  paymentUtr:       { type: String, unique: true, sparse: true },
  paymentStatus:    { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },

  // Status
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },

  // Linked student
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('ExamForm', examFormSchema);
