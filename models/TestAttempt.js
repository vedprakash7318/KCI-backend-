const mongoose = require('mongoose');

const testAttemptSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rollNumber: { type: String },
  studentName: { type: String },
  answers: [{ type: Number }], // selected option index per question
  score: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  timeTaken: { type: Number }, // seconds
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// One attempt per student per test
testAttemptSchema.index({ testId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
