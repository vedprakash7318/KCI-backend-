const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const { protect, admin } = require('../middleware/auth');

// Multer for student photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendApprovalEmail(email, name, franchiseCenter, franchiseCode, password) {
  try {
    await transporter.sendMail({
      from: `"Keerti Computer Institute" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 Your KCI Franchise Application is Approved!',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#16a34a,#059669);padding:32px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:24px">🎉 Franchise Approved!</h1>
            <p style="color:#bbf7d0;margin:8px 0 0">Keerti Computer Institute</p>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;color:#111">Dear <strong>${name}</strong>,</p>
            <p style="color:#374151">Congratulations! Your franchise application for <strong>${franchiseCenter}</strong> has been approved by KCI Admin.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0">
              <h3 style="margin:0 0 12px;color:#15803d">Your Login Credentials</h3>
              <p style="margin:4px 0;color:#374151"><strong>Email:</strong> ${email}</p>
              <p style="margin:4px 0;color:#374151"><strong>Password:</strong> <code style="background:#dcfce7;padding:2px 8px;border-radius:4px;font-size:15px">${password}</code></p>
              <p style="margin:4px 0;color:#374151"><strong>Franchise Code:</strong> <code style="background:#dcfce7;padding:2px 8px;border-radius:4px">${franchiseCode}</code></p>
            </div>
            <p style="color:#374151">Login at: <a href="${process.env.FRONTEND_URL || 'https://kci-seven.vercel.app'}/login" style="color:#16a34a">KCI Portal</a></p>
            <p style="color:#6b7280;font-size:13px">Please change your password after first login.</p>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px">
            Keerti Computer Institute | 9936384736
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// Franchise middleware
const franchiseAuth = (req, res, next) => {
  if (req.user && (req.user.role === 'franchise' || req.user.role === 'admin')) return next();
  res.status(403).json({ success: false, message: 'Franchise access required' });
};

// Register franchise (no password required from applicant)
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, franchiseCenter, franchiseCity, address } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const franchiseCode = 'KCI-F-' + Date.now().toString().slice(-6);
    // Store a temp password; real one sent on approval
    const tempPassword = 'pending_' + Date.now();
    await User.create({ name, email, password: tempPassword, phone, address, franchiseCenter, franchiseCity, franchiseCode, role: 'franchise', isApproved: false });
    res.status(201).json({ success: true, message: 'Franchise registration submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public: list approved franchises for admission form dropdown
router.get('/list', async (req, res) => {
  try {
    const franchises = await User.find({ role: 'franchise', isApproved: true })
      .select('franchiseCenter franchiseCity franchiseCode name')
      .sort('franchiseCenter');
    res.json({ success: true, franchises });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all franchises (admin)
router.get('/', protect, admin, async (req, res) => {
  try {
    const franchises = await User.find({ role: 'franchise' }).select('-password');
    res.json({ success: true, franchises });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create franchise (admin)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, email, password, phone, franchiseCenter, franchiseCity, franchisePhone, address, notes, isApproved, renewalDate, approvedAt } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const franchiseCode = 'KCI-F-' + Date.now().toString().slice(-6);
    const approved = isApproved ?? true;
    const resolvedApprovedAt = approvedAt || (approved ? new Date() : undefined);
    const resolvedRenewalDate = renewalDate || (resolvedApprovedAt ? new Date(new Date(resolvedApprovedAt).setFullYear(new Date(resolvedApprovedAt).getFullYear() + 1)) : undefined);
    const franchise = await User.create({
      name, email, password: password || 'kci123456', phone, address, notes,
      franchiseCenter, franchiseCity, franchisePhone, franchiseCode,
      role: 'franchise', isApproved: approved,
      ...(resolvedApprovedAt && { approvedAt: resolvedApprovedAt }),
      ...(resolvedRenewalDate && { renewalDate: resolvedRenewalDate }),
    });
    if (franchise.isApproved) {
      const plainPass = password || 'kci123456';
      await sendApprovalEmail(email, name, franchiseCenter, franchiseCode, plainPass);
    }
    const result = franchise.toObject();
    delete result.password;
    res.status(201).json({ success: true, franchise: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single franchise (admin)
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const franchise = await User.findOne({ _id: req.params.id, role: 'franchise' }).select('-password');
    if (!franchise) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, franchise });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update franchise (admin)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.role;
    // Only update password if provided and non-empty
    if (updates.password && updates.password.trim()) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'Not found' });
      user.password = updates.password.trim();
      delete updates.password;
      // Allow franchisePhone, notes, renewalDate, approvedAt, franchiseCode
      Object.assign(user, updates);
      await user.save();
      const result = user.toObject();
      delete result.password;
      return res.json({ success: true, franchise: result });
    }
    delete updates.password;
    const franchise = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!franchise) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, franchise });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Approve franchise — auto-generate password & send email
router.put('/:id/approve', protect, admin, async (req, res) => {
  try {
    const franchise = await User.findById(req.params.id);
    if (!franchise) return res.status(404).json({ success: false, message: 'Not found' });

    // Generate a strong readable password
    const newPassword = 'KCI@' + Math.random().toString(36).slice(-6).toUpperCase();
    franchise.isApproved = true;
    franchise.password = newPassword; // will be hashed by pre-save hook
    await franchise.save();

    // Send approval email with credentials
    await sendApprovalEmail(franchise.email, franchise.name, franchise.franchiseCenter, franchise.franchiseCode, newPassword);

    res.json({ success: true, message: 'Franchise approved and email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete franchise (admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Franchise deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Register a student under this franchise ───
router.post('/students/register', protect, franchiseAuth, upload.single('photo'), async (req, res) => {
  try {
    const { name, email, phone, fatherName, dob, address, courseName, batch, course } = req.body;

    // Auto-generate email if not provided
    const studentEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@kci.student`;

    const exists = await User.findOne({ email: studentEmail });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Auto-generate roll number
    const count = await User.countDocuments({ role: 'student' });
    const rollNumber = `KCI${new Date().getFullYear()}${String(count + 1).padStart(4, '0')}`;

    // Auto-generate form number
    const formNo = `KCI-F-${req.user.franchiseCode || 'HO'}-${String(count + 1).padStart(4, '0')}`;

    // Auto-generate password = rollNumber
    const password = rollNumber;

    const student = await User.create({
      name, email: studentEmail, password, phone, fatherName, dob, address,
      courseName, batch, course, rollNumber, formNo,
      role: 'student',
      franchiseId: req.user._id,
      franchiseCenter: req.user.franchiseCenter,
      franchiseCity: req.user.franchiseCity,
      admissionDate: new Date(),
      isActive: true,
      ...(req.file && { photo: `/uploads/${req.file.filename}` }),
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      student: {
        id: student._id,
        name: student.name,
        email: studentEmail,
        rollNumber,
        formNo,
        password, // send plain password once for franchise to share
        courseName,
        batch,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Get all students of this franchise ───
router.get('/students', protect, franchiseAuth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { role: 'student' }
      : { role: 'student', franchiseId: req.user._id };

    const students = await User.find(filter).select('-password').populate('course', 'title').sort('-createdAt');
    res.json({ success: true, students, total: students.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Update student ───
router.put('/students/:id', protect, franchiseAuth, upload.single('photo'), async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (req.user.role === 'franchise' && student.franchiseId?.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    const updates = { ...req.body };
    delete updates.password;
    if (req.file) updates.photo = `/uploads/${req.file.filename}`;
    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json({ success: true, student: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Reset student password ───
router.put('/students/:id/reset-password', protect, franchiseAuth, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (req.user.role === 'franchise' && student.franchiseId?.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    const newPassword = req.body.password || student.rollNumber;
    student.password = newPassword;
    await student.save();

    res.json({ success: true, message: 'Password reset successfully', newPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Delete student ───
router.delete('/students/:id', protect, franchiseAuth, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (req.user.role === 'franchise' && student.franchiseId?.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Dashboard stats ───
router.get('/dashboard-stats', protect, franchiseAuth, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const Certificate = require('../models/Certificate');
    const Course = require('../models/Course');
    const Admission = require('../models/Admission');
    const filter = req.user.role === 'admin' ? { role: 'student' } : { role: 'student', franchiseId: req.user._id };
    const students = await User.countDocuments(filter);
    const active = await User.countDocuments({ ...filter, isActive: true });
    const courses = await Course.countDocuments({ isActive: true });
    const studentDocs = await User.find(filter).select('_id rollNumber');
    const rollNumbers = studentDocs.map(s => s.rollNumber).filter(Boolean);
    const results = await Result.countDocuments({ rollNumber: { $in: rollNumbers } });
    const certificates = await Certificate.countDocuments({ rollNumber: { $in: rollNumbers } });
    const admissions = await Admission.countDocuments({ franchiseId: req.user._id });
    res.json({ success: true, stats: { students, active, courses, results, certificates, admissions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Get results of franchise students ───
router.get('/results', protect, franchiseAuth, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const filter = req.user.role === 'admin' ? { role: 'student' } : { role: 'student', franchiseId: req.user._id };
    const students = await User.find(filter).select('rollNumber');
    const rollNumbers = students.map(s => s.rollNumber).filter(Boolean);
    const results = await Result.find({ rollNumber: { $in: rollNumbers } }).sort('-createdAt');
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Get certificates of franchise students ───
router.get('/certificates', protect, franchiseAuth, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const filter = req.user.role === 'admin' ? { role: 'student' } : { role: 'student', franchiseId: req.user._id };
    const students = await User.find(filter).select('rollNumber');
    const rollNumbers = students.map(s => s.rollNumber).filter(Boolean);
    const certificates = await Certificate.find({ rollNumber: { $in: rollNumbers } }).sort('-createdAt');
    res.json({ success: true, certificates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Create result ───
router.post('/results', protect, franchiseAuth, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const result = await Result.create(req.body);
    res.status(201).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Update result ───
router.put('/results/:id', protect, franchiseAuth, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const result = await Result.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Delete result ───
router.delete('/results/:id', protect, franchiseAuth, async (req, res) => {
  try {
    const Result = require('../models/Result');
    await Result.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Result deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Create certificate ───
router.post('/certificates', protect, franchiseAuth, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const certificate = await Certificate.create(req.body);
    res.status(201).json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Update certificate ───
router.put('/certificates/:id', protect, franchiseAuth, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const certificate = await Certificate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Delete certificate ───
router.delete('/certificates/:id', protect, franchiseAuth, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    await Certificate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Submit admission (franchise-wise) ───
router.post('/admissions', protect, franchiseAuth, async (req, res) => {
  try {
    const Admission = require('../models/Admission');
    const admission = await Admission.create({
      ...req.body,
      franchise: req.user._id,
      franchiseId: req.user._id,
    });
    res.status(201).json({ success: true, admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Get admissions ───
router.get('/admissions', protect, franchiseAuth, async (req, res) => {
  try {
    const Admission = require('../models/Admission');
    const filter = req.user.role === 'admin' ? {} : { franchiseId: req.user._id };
    const admissions = await Admission.find(filter).sort('-createdAt');
    res.json({ success: true, admissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Update admission ───
router.put('/admissions/:id', protect, franchiseAuth, async (req, res) => {
  try {
    const Admission = require('../models/Admission');
    const admission = await Admission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FRANCHISE: Delete admission ───
router.delete('/admissions/:id', protect, franchiseAuth, async (req, res) => {
  try {
    const Admission = require('../models/Admission');
    await Admission.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Admission deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
