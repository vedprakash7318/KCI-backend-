const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const { protect, admin } = require('../middleware/auth');

// Get all active quizzes
router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isActive: true }).populate('course', 'title').populate('createdBy', 'name');
    res.json({ success: true, quizzes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single quiz
router.get('/:id', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('course', 'title');
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    res.json({ success: true, quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create quiz (admin/teacher)
router.post('/', protect, admin, async (req, res) => {
  try {
    const quiz = await Quiz.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit quiz attempt
router.post('/:id/attempt', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    const { answers } = req.body;
    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] && answers[i].toString().toLowerCase() === q.correctAnswer.toString().toLowerCase()) {
        score += q.marks;
      }
    });

    const total = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percentage >= quiz.passingMarks;

    quiz.attempts.push({ student: req.user._id, score, total, percentage, passed });
    await quiz.save();

    res.json({ success: true, score, total, percentage, passed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete quiz
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
