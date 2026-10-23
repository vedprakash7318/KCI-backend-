const Setting = require('../models/Setting');
const ExamForm = require('../models/ExamForm');
const User = require('../models/User');

// Get admit card visibility setting (public)
exports.getAdmitCardSetting = async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'admitCardEnabled' });
    res.json({ success: true, enabled: s ? s.value : false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle admit card visibility (admin only)
exports.toggleAdmitCard = async (req, res) => {
  try {
    const { enabled } = req.body;
    await Setting.findOneAndUpdate(
      { key: 'admitCardEnabled' },
      { key: 'admitCardEnabled', value: enabled },
      { upsert: true, new: true }
    );
    res.json({ success: true, enabled });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper: merge exam schedule into admitCard object
// Returns null if course has no scheduled exam date
async function mergeSchedule(admitCard) {
  try {
    const s = await Setting.findOne({ key: 'examSchedule' });
    if (!s || !s.value) return null; // No schedule set at all
    const schedule = s.value;
    const course = (admitCard.course || admitCard.courseName || '').toLowerCase().trim();

    // Find course-specific row
    const row = (schedule.courseSchedules || []).find(
      r => r.course && r.examDate && r.course.toLowerCase().trim() === course
    );

    // If no matching course row with exam date, admit card not available
    if (!row) return null;

    admitCard.examDate      = row.examDate;
    admitCard.examCenter    = row.examCenter    || schedule.examCenter    || '';
    admitCard.reportingTime = row.reportingTime || schedule.reportingTime || '9:15 AM';
    admitCard.examType      = row.examType      || schedule.examType      || 'Theory + Practical';
    admitCard.instructions  = schedule.instructions || '';
  } catch (_) { return null; }
  return admitCard;
}

// Fetch admit card — search by enrollmentNumber in ExamForm OR rollNumber in User
exports.getAdmitCard = async (req, res) => {
  try {
    const rawQuery = req.params.enrollmentNumber || req.query.query || '';
    const dobQuery = req.query.dob?.trim();
    const query = rawQuery.trim();

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide enrollment or roll number to search.' });
    }

    const normalized = query.toUpperCase();

    const isDobMatch = (recordDob, inputDob) => {
      if (!inputDob) return true;
      if (!recordDob) return false;
      const formatted = new Date(recordDob).toLocaleDateString('en-IN');
      return formatted === inputDob || recordDob === inputDob;
    };

    // 1. Try ExamForm by enrollmentNumber (Approved)
    let form = await ExamForm.findOne({ enrollmentNumber: normalized, status: 'Approved' });
    if (form) {
      if (!isDobMatch(form.dob, dobQuery)) {
        return res.status(404).json({ success: false, message: 'No record found for this enrollment/roll number and date of birth.' });
      }
      const serial = await ExamForm.countDocuments({ status: 'Approved', createdAt: { $lte: form.createdAt } });
      let admitCard = form.toObject();
      admitCard.serialNumber = String(serial).padStart(6, '0');
      admitCard.rollNumber = form.enrollmentNumber;
      admitCard = await mergeSchedule(admitCard);
      return res.json({ success: true, admitCard, source: 'examForm' });
    }

    // 2. Try ExamForm by enrollmentNumber (any status — show pending message)
    const anyForm = await ExamForm.findOne({ enrollmentNumber: normalized });
    if (anyForm) {
      if (dobQuery && !isDobMatch(anyForm.dob, dobQuery)) {
        return res.status(404).json({ success: false, message: 'No record found for this enrollment/roll number and date of birth.' });
      }
      return res.status(403).json({ success: false, message: `Your exam form status is "${anyForm.status}". Only Approved forms can download admit card.` });
    }

    // 3. Try User by rollNumber — only if they have a submitted exam form
    const student = await User.findOne({ rollNumber: normalized, role: 'student' }).select('-password');
    if (student) {
      if (dobQuery && !isDobMatch(student.dob, dobQuery)) {
        return res.status(404).json({ success: false, message: 'No record found for this enrollment/roll number and date of birth.' });
      }
      // Check if student has submitted exam form
      const studentForm = await ExamForm.findOne({ enrollmentNumber: normalized });
      if (!studentForm) {
        return res.status(403).json({ success: false, message: 'Admit card is not available. Please fill and submit your Examination Form first.' });
      }
      if (studentForm.status !== 'Approved') {
        return res.status(403).json({ success: false, message: `Your exam form status is "${studentForm.status}". Admit card will be available once your form is Approved.` });
      }
    }

    return res.status(404).json({ success: false, message: 'No record found for this enrollment/roll number. Please check and try again.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Fetch logged in student's admit card
exports.getMyAdmitCard = async (req, res) => {
  try {
    const student = req.user;
    if (!student) return res.status(401).json({ success: false, message: 'Not authorized' });

    const normalized = (student.enrollmentNumber || student.rollNumber || student.formNo || '').toUpperCase();
    if (!normalized) return res.status(404).json({ success: false, message: 'No enrollment number found.' });

    // Step 1: Check exam form exists and is Approved
    const form = await ExamForm.findOne({ enrollmentNumber: normalized });
    if (!form) return res.status(404).json({ success: false, message: 'no_form' });
    if (form.status !== 'Approved') return res.status(403).json({ success: false, message: 'not_approved', status: form.status });

    // Step 2: Check course has a scheduled exam date
    const serial = await ExamForm.countDocuments({ status: 'Approved', createdAt: { $lte: form.createdAt } });
    let admitCard = form.toObject();
    admitCard.serialNumber = String(serial).padStart(6, '0');
    admitCard.rollNumber = form.enrollmentNumber;

    const merged = await mergeSchedule(admitCard);
    if (!merged) return res.status(403).json({ success: false, message: 'no_schedule' });

    return res.json({ success: true, admitCard: merged });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get exam schedule (public / admin)
exports.getExamSchedule = async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'examSchedule' });
    res.json({ success: true, schedule: s ? s.value : null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Save exam schedule (admin) — also pushes to history
exports.saveExamSchedule = async (req, res) => {
  try {
    const schedule = {
      examCenter:      req.body.examCenter,
      reportingTime:   req.body.reportingTime,
      examType:        req.body.examType,
      instructions:    req.body.instructions,
      courseSchedules: req.body.courseSchedules || [],
      updatedAt:       new Date(),
    };
    // Save current schedule
    await Setting.findOneAndUpdate(
      { key: 'examSchedule' },
      { key: 'examSchedule', value: schedule },
      { upsert: true, new: true }
    );
    // Push to history (max 20 entries)
    const histSetting = await Setting.findOne({ key: 'examScheduleHistory' });
    const history = histSetting?.value || [];
    history.unshift({ ...schedule, savedAt: new Date() });
    if (history.length > 20) history.length = 20;
    await Setting.findOneAndUpdate(
      { key: 'examScheduleHistory' },
      { key: 'examScheduleHistory', value: history },
      { upsert: true, new: true }
    );
    res.json({ success: true, schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get exam schedule history (admin)
exports.getScheduleHistory = async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'examScheduleHistory' });
    res.json({ success: true, history: s?.value || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get schedule options (admin)
exports.getScheduleOptions = async (req, res) => {
  try {
    const Branch = require('../models/Branch');
    const branches = await Branch.find().select('name city').lean();
    const Course = require('../models/Course');
    const courses = await Course.find().select('title').lean();
    res.json({
      success: true,
      branches: branches.map(b => ({ name: b.name, city: b.city })),
      courses: courses.map(c => c.title),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Verify admit card token (QR scan verification)
exports.verifyAdmitCardToken = async (req, res) => {
  try {
    const { token } = req.params;
    const form = await ExamForm.findOne({ $or: [{ qrToken: token }, { enrollmentNumber: token.toUpperCase() }] });
    if (!form) return res.status(404).json({ success: false, message: 'Admit card not found' });
    res.json({ success: true, admitCard: form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Regenerate QR token for admit card (admin)
exports.regenerateToken = async (req, res) => {
  try {
    const { id } = req.body;
    const newToken = 'KCI-AC-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const form = await ExamForm.findByIdAndUpdate(id, { qrToken: newToken }, { new: true });
    res.json({ success: true, qrToken: newToken, form });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
