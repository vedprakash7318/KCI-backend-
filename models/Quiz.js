const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duration: { type: Number, default: 30 },
  passingMarks: { type: Number, default: 40 },
  isActive: { type: Boolean, default: true },
  questions: [{
    question: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'truefalse', 'fillinblank'], default: 'mcq' },
    options: [String],
    correctAnswer: { type: String, required: true },
    marks: { type: Number, default: 1 },
  }],
  attempts: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: Number, total: Number, percentage: Number, passed: Boolean,
    attemptedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
