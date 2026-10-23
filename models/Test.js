const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: Number, required: true }, // index 0-3
  marks: { type: Number, default: 1 },
});

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  month: { type: String }, // e.g. "June 2025"
  duration: { type: Number, default: 30 }, // minutes
  totalMarks: { type: Number, default: 0 },
  questions: [questionSchema],
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  allowedCourses: [{ type: String }], // empty = all students
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
