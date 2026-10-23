const ExamForm = require('../models/ExamForm');
const Notification = require('../models/Notification');

async function sendStudentNotification(userId, title, message, type = 'exam') {
  try {
    await Notification.create({
      title, message, type,
      targetRole: 'specific',
      targetStudents: [userId],
      branchId: null,
      isActive: true,
    });
  } catch (_) {}
}

exports.submitExamForm = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    if (userId) {
      const existing = await ExamForm.findOne({ userId });
      if (existing) {
        return res.status(400).json({ success: false, message: 'You have already submitted an examination form.', form: existing });
      }
    }
    const form = await ExamForm.create({ ...req.body, userId });
    res.status(201).json({ success: true, message: 'Exam form submitted successfully', form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyExamForm = async (req, res) => {
  try {
    const form = await ExamForm.findOne({ userId: req.user.id });
    res.json({ success: true, form: form || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExamForms = async (req, res) => {
  try {
    const forms = await ExamForm.find().sort({ createdAt: -1 });
    res.json({ success: true, forms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateExamFormStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const form = await ExamForm.findByIdAndUpdate(req.params.id, { status }, { new: true });
    // Auto-notify student
    if (form?.userId) {
      if (status === 'Approved') {
        await sendStudentNotification(form.userId,
          '✅ Exam Form Approved',
          'Your examination form has been approved. You can now download your Admit Card once the exam schedule is published.',
          'exam');
      } else if (status === 'Rejected') {
        await sendStudentNotification(form.userId,
          '❌ Exam Form Rejected',
          'Your examination form has been rejected. Please contact the institute administration for further assistance.',
          'exam');
      }
    }
    res.json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteExamForm = async (req, res) => {
  try {
    await ExamForm.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
