const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { protect, admin } = require('../middleware/auth');
const generateStudentNumbers = require('../utils/generateStudentNumbers');
const { uploadStudent } = require('../middleware/cloudinary');

// Lazy transporter — reads env at call time (fixes Vercel cold start issue)
const getTransporter = () => nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendApprovalEmail(email, name, branchName, branchCode, password) {
  try {
    await getTransporter().sendMail({
      from: `"Keerti Computer Institute" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 Your KCI Branch Application is Approved!',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);padding:32px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:24px">🎉 Branch Approved!</h1>
            <p style="color:#bfdbfe;margin:8px 0 0">Keerti Computer Institute</p>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;color:#111">Dear <strong>${name}</strong>,</p>
            <p style="color:#374151">Congratulations! Your branch application for <strong>${branchName}</strong> has been approved by KCI Admin.</p>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0">
              <h3 style="margin:0 0 12px;color:#1d4ed8">Your Login Credentials</h3>
              <p style="margin:4px 0;color:#374151"><strong>Email:</strong> ${email}</p>
              <p style="margin:4px 0;color:#374151"><strong>Password:</strong> <code style="background:#dbeafe;padding:2px 8px;border-radius:4px;font-size:15px">${password}</code></p>
              <p style="margin:4px 0;color:#374151"><strong>Branch Code:</strong> <code style="background:#dbeafe;padding:2px 8px;border-radius:4px">${branchCode}</code></p>
            </div>
            <p style="color:#374151">Login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color:#1d4ed8">KCI Portal</a></p>
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

async function sendStudentApprovalEmail(email, name, rollNumber, formNo, password, branchName, courseName) {
  try {
    await getTransporter().sendMail({
      from: `"Keerti Computer Institute" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎓 Your KCI Student Account is Approved!',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:32px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:24px">🎓 Welcome to KCI!</h1>
            <p style="color:#bfdbfe;margin:8px 0 0">Your student account has been approved</p>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;color:#111">Dear <strong>${name}</strong>,</p>
            <p style="color:#374151">Your student account at <strong>${branchName}</strong> for <strong>${courseName}</strong> has been approved.</p>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0">
              <h3 style="margin:0 0 12px;color:#1d4ed8">Your Login Credentials</h3>
              <p style="margin:4px 0;color:#374151"><strong>Form Number:</strong> <code style="background:#dbeafe;padding:2px 8px;border-radius:4px;font-size:15px">${formNo}</code></p>
              <p style="margin:4px 0;color:#374151"><strong>Password:</strong> <code style="background:#dbeafe;padding:2px 8px;border-radius:4px;font-size:15px">${password}</code></p>
              <p style="margin:4px 0;color:#374151"><strong>Login with:</strong> Form Number + Password</p>
            </div>
            <p style="color:#374151">Login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color:#1d4ed8">KCI Student Portal</a></p>
            <p style="color:#6b7280;font-size:13px">Please change your password after first login.</p>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px">
            Keerti Computer Institute | 9936384736
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('Student email failed:', err.message);
  }
}


const branchAuth = (req, res, next) => {
  if (req.user && (req.user.role === 'branch' || req.user.role === 'franchise' || req.user.role === 'admin')) return next();
  res.status(403).json({ success: false, message: 'Branch access required' });
};

// Public: Student verification by formNo / enrollmentNumber / rollNumber
router.get('/verify-student', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ success: false, message: 'Query required' });
    const Result = require('../models/Result');
    const Certificate = require('../models/Certificate');
    const student = await User.findOne({
      role: 'student',
      $or: [
        { formNo: q }, { formNumber: q },
        { enrollmentNumber: q },
        { rollNumber: q },
        { registrationNumber: q },
      ],
    }).select('-password');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Fetch results & certificates
    const orQ = [];
    if (student.rollNumber) orQ.push({ rollNumber: student.rollNumber });
    if (student.enrollmentNumber) orQ.push({ enrollmentNumber: student.enrollmentNumber });
    if (student.formNo) orQ.push({ formNo: student.formNo });
    orQ.push({ studentId: student._id }, { student: student._id });

    const [results, certificates] = await Promise.all([
      Result.find({ $or: orQ, isApproved: true }).sort('-createdAt').lean(),
      Certificate.find({ $or: orQ, isApproved: true }).sort('-createdAt').lean(),
    ]);

    const branch = (student.branchId || student.franchiseId)
      ? await User.findById(student.branchId || student.franchiseId)
          .select('branchName branchCity branchCode branchPhone phone franchiseCenter franchiseCity franchiseCode')
          .lean()
      : null;

    // Strip sensitive fields from student
    const safe = student.toObject ? student.toObject() : { ...student };
    delete safe.password; delete safe.otp; delete safe.otpExpiry;

    res.json({ success: true, student: safe, results, certificates, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public: Get all approved branches (for admission form)
router.get('/public', async (req, res) => {
  try {
    const branches = await User.find({ role: 'branch', isApproved: true })
      .select('branchName branchCity branchCode branchAddress branchPhone name phone')
      .sort('branchName');
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public: Apply for branch
router.post('/apply', async (req, res) => {
  try {
    const { name, email, phone, branchName, branchCity, branchAddress } = req.body;
    if (!name || !email || !branchName || !branchCity)
      return res.status(400).json({ success: false, message: 'Fill all required fields' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const branchCode = 'KCI-B-' + Date.now().toString().slice(-6);
    await User.create({
      name, email, password: 'pending_' + Date.now(), phone,
      branchName, branchCity, branchAddress, branchCode,
      role: 'branch', isApproved: false,
    });
    res.status(201).json({ success: true, message: 'Branch application submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Get all branches
router.get('/', protect, admin, async (req, res) => {
  try {
    const branches = await User.find({ role: 'branch' }).select('-password').sort('-createdAt');
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Create branch directly
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, email, password, phone, branchName, branchCity, branchAddress, notes, isApproved, branchCode: customCode, branchPhone, renewalDate, approvedAt } = req.body;
    if (!name || !email || !branchName || !branchCity)
      return res.status(400).json({ success: false, message: 'Fill all required fields' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const branchCode = customCode?.trim() || ('KCI-B-' + Date.now().toString().slice(-6));
    const plainPass = password || 'kci123456';
    const approved = isApproved ?? true;
    const resolvedApprovedAt = approvedAt || (approved ? new Date() : undefined);
    const resolvedRenewalDate = renewalDate || (resolvedApprovedAt ? new Date(new Date(resolvedApprovedAt).setFullYear(new Date(resolvedApprovedAt).getFullYear() + 1)) : undefined);
    const branch = await User.create({
      name, email, password: plainPass, phone,
      branchName, branchCity, branchAddress, branchCode, notes, branchPhone,
      role: 'branch', isApproved: approved,
      ...(resolvedApprovedAt && { approvedAt: resolvedApprovedAt }),
      ...(resolvedRenewalDate && { renewalDate: resolvedRenewalDate }),
    });
    if (branch.isApproved) {
      await sendApprovalEmail(email, name, branchName, branchCode, plainPass);
    }
    const result = branch.toObject();
    delete result.password;
    res.status(201).json({ success: true, branch: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Upload branch owner photo
const multer = require('multer');
const path = require('path');
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const photoUpload = multer({ storage: photoStorage });

router.put('/:id/upload-photo', protect, admin, photoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const photo = `/uploads/${req.file.filename}`;
    const branch = await User.findByIdAndUpdate(req.params.id, { photo }, { new: true }).select('-password');
    if (!branch) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Update branch
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const updates = { ...req.body };
    // Prevent privilege escalation — never allow role or isSuperAdmin changes via this endpoint
    delete updates.role;
    delete updates.isSuperAdmin;
    if (updates.password && updates.password.trim()) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'Not found' });
      user.password = updates.password.trim();
      delete updates.password;
      Object.assign(user, updates);
      await user.save();
      const result = user.toObject();
      delete result.password;
      return res.json({ success: true, branch: result });
    }
    delete updates.password;
    const branch = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!branch) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Approve branch — respond immediately, send email in background
router.put('/:id/approve', protect, admin, async (req, res) => {
  try {
    const branch = await User.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Not found' });
    const newPassword = 'KCI@' + Math.random().toString(36).slice(-6).toUpperCase();
    const approvedAt = new Date();
    const renewalDate = new Date(approvedAt);
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    branch.isApproved = true;
    branch.password = newPassword;
    branch.approvedAt = approvedAt;
    if (!branch.renewalDate) branch.renewalDate = renewalDate;
    await branch.save();
    // Respond immediately — don't wait for email
    res.json({ success: true, message: 'Branch approved! Credentials email sending in background.', password: newPassword });
    // Fire email after response
    sendApprovalEmail(branch.email, branch.name, branch.branchName, branch.branchCode, newPassword)
      .catch(err => console.error('Branch approval email failed:', err.message));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Reset any user's password (fixes plaintext password issue)
router.put('/:id/reset-password', protect, admin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || !password.trim())
      return res.status(400).json({ success: false, message: 'Password required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    user.password = password.trim();
    await user.save(); // triggers bcrypt pre-save hook
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Delete branch
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Branch deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Dashboard stats
router.get('/dashboard-stats', protect, branchAuth, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const Certificate = require('../models/Certificate');
    const Admission = require('../models/Admission');
    const Course = require('../models/Course');

    // Auto-fix: if branch has no renewalDate, set it from createdAt + 1 year
    if (req.user.role === 'branch' && !req.user.renewalDate) {
      const base = req.user.approvedAt || req.user.createdAt || new Date();
      const renewal = new Date(base);
      renewal.setFullYear(renewal.getFullYear() + 1);
      await User.findByIdAndUpdate(req.user._id, {
        renewalDate: renewal,
        approvedAt: req.user.approvedAt || base,
      });
    }

    const studentFilter = req.user.role === 'admin'
      ? { role: 'student' }
      : { role: 'student', branchId: req.user._id };

    const admissionFilter = req.user.role === 'admin'
      ? {}
      : { branchId: req.user._id };

    const students = await User.countDocuments(studentFilter);
    const active = await User.countDocuments({ ...studentFilter, isActive: true });
    const admissions = await Admission.countDocuments(admissionFilter);
    const courses = await Course.countDocuments({ isActive: true });
    const studentDocs = await User.find(studentFilter).select('rollNumber');
    const rollNumbers = studentDocs.map(s => s.rollNumber).filter(Boolean);
    const results = await Result.countDocuments({ rollNumber: { $in: rollNumbers } });
    const certificates = await Certificate.countDocuments({ rollNumber: { $in: rollNumbers } });
    res.json({ success: true, stats: { students, active, admissions, courses, results, certificates } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Get own students
router.get('/students', protect, branchAuth, async (req, res) => {
  try {
    // Re-read branch from DB to ensure we use the current, authoritative identity
    const branchUser = req.user.role === 'admin' ? req.user : await User.findById(req.user._id).select('_id role isApproved').lean();
    if (!branchUser) return res.status(401).json({ success: false, message: 'Branch account not found' });
    if (branchUser.role !== 'admin' && !branchUser.isApproved)
      return res.status(403).json({ success: false, message: 'Branch account is not approved' });

    const filter = branchUser.role === 'admin'
      ? { role: 'student' }
      : { role: 'student', branchId: branchUser._id };
    const students = await User.find(filter).select('-password').populate('course', 'title').sort('-createdAt');
    res.json({ success: true, students, total: students.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Update admission status + create/update student account + send credentials email
router.put('/admissions/:id/status', protect, branchAuth, async (req, res) => {
  try {
    const Admission = require('../models/Admission');
    const { status } = req.body;
    // Branch cannot do final Approved — only Admin can
    if (status === 'Approved' && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Only Admin can give final approval' });
    if (!['Pending', 'Verified', 'Approved', 'Rejected'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const admission = await Admission.findById(req.params.id).populate('course', 'title');
    if (!admission) return res.status(404).json({ success: false, message: 'Not found' });

    const wasNotApproved = admission.status !== 'Approved';
    admission.status = status;

    let studentData = null;

    if (status === 'Approved' && wasNotApproved) {
      const courseName = admission.course?.title || '';
      const branchName = req.user.branchName || 'KCI Branch';
      const existing = await User.findOne({ email: admission.email });

      if (!existing) {
        // New student — create account
        const { rollNumber, enrollmentNumber, registrationNumber, formNo } = await generateStudentNumbers();
        const plainPassword = 'KCI@' + Math.random().toString(36).slice(-6).toUpperCase();

        const created = await User.create({
          name: admission.name,
          email: admission.email,
          password: plainPassword,
          phone: admission.phone || '',
          address: admission.address || '',
          dob: admission.dob || null,
          fatherName: admission.fatherName || '',
          batch: admission.batch || '',
          rollNumber,
          enrollmentNumber,
          registrationNumber,
          formNo,
          courseName,
          course: admission.course?._id || admission.course,
          branchId: req.user._id,
          branchName: req.user.branchName,
          branchCity: req.user.branchCity,
          role: 'student',
          isApproved: true,
          isActive: true,
          admissionDate: new Date(),
        });
        admission.studentUserId = created._id;
        studentData = created.toObject();
        delete studentData.password;

        // Fire email in background — don't await, respond immediately
        getTransporter().sendMail({
          from: `"Keerti Computer Institute" <${process.env.EMAIL_USER}>`,
          to: admission.email,
          subject: '🎉 Admission Approved — Your KCI Student Login Credentials',
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);padding:32px;text-align:center">
                <img src="https://kci-seven.vercel.app/logo.png" alt="KCI" style="width:56px;height:56px;border-radius:12px;margin-bottom:12px" />
                <h1 style="color:#fff;margin:0;font-size:26px">🎉 Admission Approved!</h1>
                <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px">Keerti Computer Institute</p>
              </div>
              <div style="padding:32px">
                <p style="font-size:16px;color:#111">Dear <strong>${admission.name}</strong>,</p>
                <p style="color:#374151;line-height:1.6">Welcome to <strong>Keerti Computer Institute</strong>! 🎓<br/>Your admission at <strong>${branchName}</strong> has been <strong style="color:#16a34a">approved</strong>. Your student account is now active.</p>
                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:24px;margin:24px 0">
                  <h3 style="margin:0 0 16px;color:#1d4ed8;font-size:16px">🔐 Your Login Credentials</h3>
                  <table style="width:100%;border-collapse:collapse">
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px">Login Email</td><td style="padding:6px 0"><code style="background:#dbeafe;padding:3px 10px;border-radius:4px;font-size:14px;color:#1e40af">${admission.email}</code></td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Temporary Password</td><td style="padding:6px 0"><code style="background:#dbeafe;padding:3px 10px;border-radius:4px;font-size:15px;font-weight:bold;color:#1e40af">${plainPassword}</code></td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Enrollment Number</td><td style="padding:6px 0"><code style="background:#dcfce7;padding:3px 10px;border-radius:4px;font-size:14px;font-weight:bold;color:#15803d">${created.enrollmentNumber}</code></td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Roll Number</td><td style="padding:6px 0"><code style="background:#dcfce7;padding:3px 10px;border-radius:4px;font-size:14px;color:#15803d">${created.rollNumber}</code></td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Form Number</td><td style="padding:6px 0"><code style="background:#dcfce7;padding:3px 10px;border-radius:4px;font-size:14px;color:#15803d">${created.formNo}</code></td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Course</td><td style="padding:6px 0;color:#374151;font-size:13px;font-weight:600">${courseName}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Branch</td><td style="padding:6px 0;color:#374151;font-size:13px">${branchName}</td></tr>
                  </table>
                </div>
                <div style="text-align:center;margin:28px 0">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">Login to Student Portal →</a>
                </div>
                <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px">
                  <p style="margin:0;color:#92400e;font-size:13px">⚠️ <strong>Important:</strong> Please change your password after your first login.</p>
                </div>
                <p style="color:#6b7280;font-size:13px;margin-top:20px">For help: <strong>9936384736 / 9919660880</strong></p>
              </div>
              <div style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px">Keerti Computer Institute | 9936384736</div>
            </div>`,
        }).then(() => console.log('✅ Admission approval email sent to:', admission.email))
          .catch(e => console.error('❌ Email failed:', e.message));
      } else {
        // Existing student — auto-fill missing fields from admission
        const updates = {};
        if (!existing.phone && admission.phone) updates.phone = admission.phone;
        if (!existing.address && admission.address) updates.address = admission.address;
        if (!existing.dob && admission.dob) updates.dob = admission.dob;
        if (!existing.fatherName && admission.fatherName) updates.fatherName = admission.fatherName;
        if (!existing.batch && admission.batch) updates.batch = admission.batch;
        if (!existing.courseName && courseName) updates.courseName = courseName;
        if (!existing.branchId) updates.branchId = req.user._id;
        const updated = Object.keys(updates).length > 0
          ? await User.findByIdAndUpdate(existing._id, updates, { new: true }).select('-password')
          : existing;
        admission.studentUserId = existing._id;
        studentData = updated.toObject ? updated.toObject() : updated;
        delete studentData.password;
      }
    }

    await admission.save();
    res.json({ success: true, admission, newStudent: studentData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Delete admission
router.delete('/admissions/:id', protect, branchAuth, async (req, res) => {
  try {
    const Admission = require('../models/Admission');
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'branch' && admission.branchId?.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied: not your branch admission' });
    await Admission.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Admission deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Get own admissions
router.get('/admissions', protect, branchAuth, async (req, res) => {
  try {
    const Admission = require('../models/Admission');
    const filter = req.user.role === 'admin' ? {} : { branchId: req.user._id };
    const admissions = await Admission.find(filter)
      .populate('course', 'title')
      .sort('-createdAt');
    res.json({ success: true, admissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Get own results
router.get('/results', protect, branchAuth, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const students = await User.find({ role: 'student', branchId: req.user._id }).select('rollNumber');
    const rollNumbers = students.map(s => s.rollNumber).filter(Boolean);
    const results = await Result.find({ rollNumber: { $in: rollNumbers } }).sort('-createdAt');
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Add result (PNG ONLY)
const { uploadResultPng } = require('../middleware/cloudinary');

const handleResultPngUpload = (req, res, next) => {
  uploadResultPng.single('resultFile')(req, res, (err) => {
    if (err) {
      const msg = err.message?.includes('ONLY_PNG_ALLOWED')
        ? 'Only PNG files are accepted for results. Please upload a PNG image.'
        : err.message || 'File upload error';
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
};

router.post('/results', protect, branchAuth, handleResultPngUpload, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const AuditLog = require('../models/AuditLog');
    const data = { ...req.body };
    if (req.file) {
      data.resultFile = req.file.path;
      data.isApproved = true;
      data.isPublished = true;
    }
    data.uploadedBy = req.user._id;
    data.uploadedByRole = req.user.role;
    if (!data.branchId) data.branchId = req.user._id;
    const result = await Result.create(data);
    try {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
      await AuditLog.create({
        action: 'RESULT_UPLOADED', performedBy: req.user._id, performedByName: req.user.name,
        performedByRole: req.user.role, branchId: req.user._id,
        targetId: result._id, targetModel: 'Result',
        details: { studentName: result.studentName, rollNumber: result.rollNumber }, ip,
      });
    } catch (_) {}
    res.status(201).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Update result (PNG ONLY)
router.put('/results/:id', protect, branchAuth, handleResultPngUpload, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const existing = await Result.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });
    // Branch ownership check
    if (req.user.role === 'branch') {
      const students = await User.find({ role: 'student', branchId: req.user._id }).select('_id rollNumber');
      const ids = students.map(s => s._id.toString());
      const rolls = students.map(s => s.rollNumber).filter(Boolean);
      const isOwned = (existing.branchId?.toString() === req.user._id.toString()) ||
        (existing.studentId && ids.includes(existing.studentId.toString())) ||
        (existing.rollNumber && rolls.includes(existing.rollNumber));
      if (!isOwned) return res.status(403).json({ success: false, message: 'Access denied: not your branch result' });
    }
    const data = { ...req.body };
    if (req.file) {
      data.resultFile = req.file.path;
      data.isApproved = true;
      data.isPublished = true;
    }
    const result = await Result.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!result) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Approve/toggle result
router.put('/results/:id/approve', protect, branchAuth, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const isApproved = req.body.isApproved !== undefined ? req.body.isApproved : true;
    const result = await Result.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
    if (!result) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Delete result
router.delete('/results/:id', protect, branchAuth, async (req, res) => {
  try {
    const Result = require('../models/Result');
    const existing = await Result.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });
    // Branch ownership check
    if (req.user.role === 'branch') {
      const students = await User.find({ role: 'student', branchId: req.user._id }).select('_id rollNumber');
      const ids = students.map(s => s._id.toString());
      const rolls = students.map(s => s.rollNumber).filter(Boolean);
      const isOwned = (existing.branchId?.toString() === req.user._id.toString()) ||
        (existing.studentId && ids.includes(existing.studentId.toString())) ||
        (existing.rollNumber && rolls.includes(existing.rollNumber));
      if (!isOwned) return res.status(403).json({ success: false, message: 'Access denied: not your branch result' });
    }
    await Result.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Result deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Get own certificates
router.get('/certificates', protect, branchAuth, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const students = await User.find({ role: 'student', branchId: req.user._id }).select('rollNumber');
    const rollNumbers = students.map(s => s.rollNumber).filter(Boolean);
    const certificates = await Certificate.find({ rollNumber: { $in: rollNumbers } }).sort('-createdAt');
    res.json({ success: true, certificates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Get next certificate number
router.get('/certificates/next-number', protect, branchAuth, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const { courseName } = req.query;
    const year = new Date().getFullYear();
    // Get course abbreviation
    const courseAbbr = (() => {
      if (!courseName) return 'CERT';
      const map = {
        'Diploma in Computer Application (DCA)': 'DCA',
        'Advance Diploma in Computer Application (ADCA)': 'ADCA',
        'Certificate in Computer Application (CCA)': 'CCA',
        'Certificate In Fundamental (CIF)': 'CIF',
        'Tally Specialist Course With GST': 'TALLY',
        'Certificate In Tally A/c With GST (CIT)': 'CIT',
        'Certificate In Office Package & Tally A/C (COPT)': 'COPT',
        'Desktop Publishing (DTP)': 'DTP',
        'Computer Typing (Hindi + English)': 'TYPING',
        'Course On Computer Concept (CCC from NIELIT)': 'CCC',
      };
      return map[courseName] || courseName.match(/\(([^)]+)\)/)?.[1] || 'CERT';
    })();
    const count = await Certificate.countDocuments();
    const serial = String(count + 1).padStart(4, '0');
    const certNumber = `KCI/${year}/${courseAbbr}/${serial}`;
    res.json({ success: true, certNumber });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Add certificate (PNG ONLY)
const { uploadCertificatePng } = require('../middleware/cloudinary');

const handleCertPngUpload = (req, res, next) => {
  uploadCertificatePng.single('certificateFile')(req, res, (err) => {
    if (err) {
      const msg = err.message?.includes('ONLY_PNG_ALLOWED')
        ? 'Only PNG files are accepted for certificates. Please upload a PNG image.'
        : err.message || 'File upload error';
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
};

router.post('/certificates', protect, branchAuth, handleCertPngUpload, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const Notification = require('../models/Notification');
    const data = { ...req.body };
    if (req.file) data.certificateFile = req.file.path;
    // Cross-populate all identifier fields so student dashboard can find it
    if (!data.enrollmentNumber && data.rollNumber) data.enrollmentNumber = data.rollNumber;
    if (!data.formNo && data.rollNumber) data.formNo = data.rollNumber;
    if (!data.rollNumber && data.enrollmentNumber) data.rollNumber = data.enrollmentNumber;
    // Try to link student _id
    if (!data.student) {
      const q = [];
      if (data.enrollmentNumber) q.push({ enrollmentNumber: data.enrollmentNumber });
      if (data.formNo) q.push({ formNo: data.formNo });
      if (data.rollNumber) q.push({ rollNumber: data.rollNumber });
      if (q.length) {
        const s = await User.findOne({ $or: q, role: 'student' });
        if (s) {
          data.student = s._id;
          if (!data.enrollmentNumber && s.enrollmentNumber) data.enrollmentNumber = s.enrollmentNumber;
          if (!data.formNo && s.formNo) data.formNo = s.formNo;
          if (!data.rollNumber && s.rollNumber) data.rollNumber = s.rollNumber;
        }
      }
    }
    const certificate = await Certificate.create(data);
    // Notify student
    try {
      await Notification.create({
        title: '🏅 Certificate Uploaded',
        message: `Your certificate for ${certificate.courseName} has been uploaded. You can now view and download it from your Student Dashboard.`,
        type: 'certificate',
        targetRole: 'student',
        branchId: req.user._id,
        isActive: true,
      });
    } catch (_) {}
    res.status(201).json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Update certificate (PNG ONLY)
router.put('/certificates/:id', protect, branchAuth, handleCertPngUpload, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const data = { ...req.body };
    if (req.file) data.certificateFile = req.file.path;
    if (!data.enrollmentNumber && data.rollNumber) data.enrollmentNumber = data.rollNumber;
    if (!data.formNo && data.rollNumber) data.formNo = data.rollNumber;
    if (!data.rollNumber && data.enrollmentNumber) data.rollNumber = data.enrollmentNumber;
    const certificate = await Certificate.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!certificate) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Approve/toggle certificate
router.put('/certificates/:id/approve', protect, branchAuth, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const isApproved = req.body.isApproved !== undefined ? req.body.isApproved : true;
    const certificate = await Certificate.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
    if (!certificate) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Delete certificate
router.delete('/certificates/:id', protect, branchAuth, async (req, res) => {
  try {
    const Certificate = require('../models/Certificate');
    const existing = await Certificate.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });
    // Branch ownership check
    if (req.user.role === 'branch') {
      const students = await User.find({ role: 'student', branchId: req.user._id }).select('_id rollNumber enrollmentNumber formNo');
      const ids = students.map(s => s._id.toString());
      const rolls = students.map(s => s.rollNumber).filter(Boolean);
      const enrolNos = students.map(s => s.enrollmentNumber).filter(Boolean);
      const formNos = students.map(s => s.formNo).filter(Boolean);
      const isOwned = (existing.branchId?.toString() === req.user._id.toString()) ||
        (existing.student && ids.includes(existing.student.toString())) ||
        (existing.rollNumber && rolls.includes(existing.rollNumber)) ||
        (existing.enrollmentNumber && enrolNos.includes(existing.enrollmentNumber)) ||
        (existing.formNo && formNos.includes(existing.formNo));
      if (!isOwned) return res.status(403).json({ success: false, message: 'Access denied: not your branch certificate' });
    }
    await Certificate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── TEST ROUTES ──────────────────────────────────────────────────────────────

// Branch: Get own tests
router.get('/tests', protect, branchAuth, async (req, res) => {
  try {
    const Test = require('../models/Test');
    const filter = req.user.role === 'admin' ? {} : { branchId: req.user._id };
    const tests = await Test.find(filter).sort('-createdAt');
    res.json({ success: true, tests });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Branch: Create test
router.post('/tests', protect, branchAuth, async (req, res) => {
  try {
    const Test = require('../models/Test');
    const rawQuestions = req.body.questions || [];
    const questions = rawQuestions.map(q => ({
      question: q.question || 'Untitled Question',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer !== undefined ? Number(q.correctAnswer) : (q.correctOption !== undefined ? Number(q.correctOption) : 0),
      marks: Number(q.marks) || 1,
    }));
    const totalMarks = questions.reduce((a, q) => a + (Number(q.marks) || 1), 0);
    const data = {
      title: req.body.title || 'Monthly Assessment Test',
      description: req.body.description || '',
      month: req.body.month || '',
      duration: Number(req.body.duration) || 30,
      totalMarks,
      questions,
      branchId: req.user._id,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      allowedCourses: req.body.allowedCourses || [],
    };
    if (data._id && !mongoose.Types.ObjectId.isValid(data._id)) {
      delete data._id;
    }
    const test = await Test.create(data);
    res.status(201).json({ success: true, test });
  } catch (err) {
    console.error('Error creating branch test:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Update test
router.put('/tests/:id', protect, branchAuth, async (req, res) => {
  try {
    const Test = require('../models/Test');
    const rawQuestions = req.body.questions || [];
    const questions = rawQuestions.map(q => ({
      question: q.question || 'Untitled Question',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer !== undefined ? Number(q.correctAnswer) : (q.correctOption !== undefined ? Number(q.correctOption) : 0),
      marks: Number(q.marks) || 1,
    }));
    const totalMarks = questions.reduce((a, q) => a + (Number(q.marks) || 1), 0);
    const updateData = {
      ...req.body,
      totalMarks,
      questions,
    };
    delete updateData.branchId;
    delete updateData._id;
    const test = await Test.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!test) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, test });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Branch: Toggle test active status
router.put('/tests/:id/toggle', protect, branchAuth, async (req, res) => {
  try {
    const Test = require('../models/Test');
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    test.isActive = req.body.isActive !== undefined ? req.body.isActive : !test.isActive;
    await test.save();
    res.json({ success: true, test });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Branch: Delete test
router.delete('/tests/:id', protect, branchAuth, async (req, res) => {
  try {
    const Test = require('../models/Test');
    await Test.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Branch: Get test attempts
router.get('/tests/:id/attempts', protect, branchAuth, async (req, res) => {
  try {
    const TestAttempt = require('../models/TestAttempt');
    const attempts = await TestAttempt.find({ testId: req.params.id }).sort('-submittedAt');
    res.json({ success: true, attempts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Student: Get available tests for their branch
router.get('/student/tests', protect, async (req, res) => {
  try {
    const Test = require('../models/Test');
    const TestAttempt = require('../models/TestAttempt');
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });

    // Resolve branchId
    let branchId = req.user.branchId || req.user.franchiseId;
    if (!branchId && req.user.branchName) {
      const branchUser = await User.findOne({
        role: 'branch',
        branchName: { $regex: new RegExp(`^${req.user.branchName.trim()}$`, 'i') },
      });
      if (branchUser) {
        branchId = branchUser._id;
        // Fix student record for fast future lookups
        User.findByIdAndUpdate(req.user._id, { branchId: branchUser._id }).exec();
      }
    }

    if (!branchId) return res.json({ success: true, tests: [] });

    // Only active tests for this student's branch
    const tests = await Test.find({ branchId, isActive: true }).select('-questions.correctAnswer').sort('-createdAt');
    const attempts = await TestAttempt.find({ studentId: req.user._id }).select('testId score percentage');
    const attemptMap = {};
    attempts.forEach(a => { attemptMap[a.testId.toString()] = a; });
    const testsWithStatus = tests.map(t => ({
      ...t.toObject(),
      attempted: !!attemptMap[t._id.toString()],
      myScore: attemptMap[t._id.toString()]?.score,
      myPercentage: attemptMap[t._id.toString()]?.percentage,
    }));
    res.json({ success: true, tests: testsWithStatus });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Student: Get single test with questions (no correct answers)
router.get('/student/tests/:id', protect, async (req, res) => {
  try {
    const Test = require('../models/Test');
    const TestAttempt = require('../models/TestAttempt');
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const test = await Test.findById(req.params.id).select('-questions.correctAnswer');
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    const attempted = await TestAttempt.findOne({ testId: req.params.id, studentId: req.user._id });
    res.json({ success: true, test, attempted: !!attempted, attempt: attempted });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Student: Submit test
router.post('/student/tests/:id/submit', protect, async (req, res) => {
  try {
    const Test = require('../models/Test');
    const TestAttempt = require('../models/TestAttempt');
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const existing = await TestAttempt.findOne({ testId: req.params.id, studentId: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'Already attempted' });
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    const { answers, timeTaken } = req.body;
    let score = 0;
    test.questions.forEach((q, i) => {
      if (answers[i] !== undefined && answers[i] === q.correctAnswer) score += (q.marks || 1);
    });
    const percentage = test.totalMarks > 0 ? Math.round((score / test.totalMarks) * 100) : 0;
    const attempt = await TestAttempt.create({
      testId: test._id, studentId: req.user._id,
      rollNumber: req.user.rollNumber, studentName: req.user.name,
      answers, score, totalMarks: test.totalMarks, percentage, timeTaken,
    });
    // Return with correct answers for result display
    res.json({ success: true, attempt, correctAnswers: test.questions.map(q => q.correctAnswer) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Student: Get own attempt result
router.get('/student/tests/:id/result', protect, async (req, res) => {
  try {
    const Test = require('../models/Test');
    const TestAttempt = require('../models/TestAttempt');
    const attempt = await TestAttempt.findOne({ testId: req.params.id, studentId: req.user._id });
    if (!attempt) return res.status(404).json({ success: false, message: 'Not attempted' });
    const test = await Test.findById(req.params.id);
    res.json({ success: true, attempt, test, correctAnswers: test.questions.map(q => q.correctAnswer) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── STUDENT ROUTES (Branch manages students) ──────────────────────────────

// Branch: Add student
router.post('/students', protect, branchAuth, uploadStudent.single('photo'), async (req, res) => {
  try {
    const { name, email, phone, fatherName, dob, address, courseName, batch, password } = req.body;

    // Validate required fields
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Student name is required' });
    if (!email || !email.trim()) return res.status(400).json({ success: false, message: 'Student email is required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return res.status(400).json({ success: false, message: 'Invalid email format' });

    // Verify branch is approved (re-read from DB, not just JWT)
    const branchUser = await User.findById(req.user._id).select('role isApproved branchName branchCity branchCode');
    if (!branchUser) return res.status(401).json({ success: false, message: 'Branch account not found' });
    if (branchUser.role !== 'admin' && !branchUser.isApproved)
      return res.status(403).json({ success: false, message: 'Branch account is not approved' });

    // Check email uniqueness
    const emailExists = await User.findOne({ email: email.trim().toLowerCase() });
    if (emailExists) return res.status(400).json({ success: false, message: 'A student with this email already exists' });

    // Handle optional manually-entered numbers
    const manualRoll = req.body.rollNumber?.trim();
    const manualEnroll = req.body.enrollmentNumber?.trim();
    const manualForm = req.body.formNumber?.trim() || req.body.formNo?.trim();

    // Validate uniqueness of manually entered numbers
    if (manualRoll) {
      const conflict = await User.findOne({ rollNumber: manualRoll });
      if (conflict) return res.status(400).json({ success: false, message: `Roll number "${manualRoll}" is already assigned to another student.` });
    }
    if (manualEnroll) {
      const conflict = await User.findOne({ enrollmentNumber: manualEnroll });
      if (conflict) return res.status(400).json({ success: false, message: `Enrollment number "${manualEnroll}" is already assigned to another student.` });
    }
    if (manualForm) {
      const conflict = await User.findOne({ $or: [{ formNo: manualForm }, { formNumber: manualForm }] });
      if (conflict) return res.status(400).json({ success: false, message: `Form number "${manualForm}" is already assigned to another student.` });
    }

    // Auto-generate any numbers not manually provided
    const generated = await generateStudentNumbers();
    const rollNumber = manualRoll || generated.rollNumber;
    const enrollmentNumber = manualEnroll || generated.enrollmentNumber;
    const registrationNumber = generated.registrationNumber;
    const formNo = manualForm || generated.formNo;

    const studentPassword = (password && password.trim().length >= 4)
      ? password.trim()
      : ('KCI@' + Math.floor(1000 + Math.random() * 9000));

    // Only set course if it's a valid 24-char ObjectId string
    const courseId = req.body.course && typeof req.body.course === 'string' && /^[a-f\d]{24}$/i.test(req.body.course)
      ? req.body.course : undefined;

    const student = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: studentPassword,
      phone: phone || '',
      fatherName: fatherName || '',
      dob: dob || null,
      address: address || '',
      courseName: courseName || '',
      batch: batch || '',
      rollNumber,
      enrollmentNumber,
      registrationNumber,
      formNo,
      formNumber: formNo,
      ...(courseId && { course: courseId }),
      role: 'student',
      branchId: branchUser._id,
      branchName: branchUser.branchName || '',
      branchCity: branchUser.branchCity || '',
      isApproved: true,
      isActive: true,
      admissionDate: new Date(),
      ...(req.file && { photo: req.file.path }),
    });

    await student.save();

    const saved = await User.findById(student._id).select('-password');
    if (!saved) {
      console.error('Student save appeared to succeed but record not found:', student._id);
      return res.status(500).json({ success: false, message: 'Student record could not be verified after save. Please try again.' });
    }

    res.status(201).json({ success: true, student: saved, generatedPassword: studentPassword });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      const friendlyField = { rollNumber: 'Roll Number', enrollmentNumber: 'Enrollment Number', email: 'Email', formNo: 'Form Number', formNumber: 'Form Number' }[field] || field;
      return res.status(400).json({ success: false, message: `${friendlyField} already exists. Please use a different value or leave it blank to auto-generate.` });
    }
    console.error('Student creation error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

const isStudentOwnedByBranch = (student, user) => {
  if (user.role === 'admin') return true;
  if (!student) return false;
  if (student.branchId && student.branchId.toString() === user._id.toString()) return true;
  return false;
};

// Branch: Update student
router.put('/students/:id', protect, branchAuth, uploadStudent.single('photo'), async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!isStudentOwnedByBranch(student, req.user))
      return res.status(403).json({ success: false, message: 'Access denied' });

    // Strip all fields that are arrays/objects in schema — never sent from edit form
    const STRIP = ['videoProgress', 'otp', 'otpExpiry', 'role', 'password', 'newPassword', 'branchId', 'franchiseId'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => !STRIP.includes(k))
    );

    // Sanitize course — only keep valid ObjectId
    if (updates.course !== undefined) {
      if (typeof updates.course !== 'string' || !/^[a-f\d]{24}$/i.test(updates.course))
        delete updates.course;
    }

    // Handle isApproved boolean from FormData string
    if (updates.isApproved !== undefined) {
      updates.isApproved = updates.isApproved === 'true' || updates.isApproved === true;
    }

    if (req.file) updates.photo = req.file.path;

    // Handle password change separately via .save() with bcrypt hook
    const newPw = (req.body.password || req.body.newPassword)?.trim();
    if (newPw && newPw.length >= 4) {
      student.password = newPw;
      await student.save({ validateBeforeSave: false });
    }

    // Update remaining fields — skip validators to avoid videoProgress/array issues
    const updated = await User.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: false }
    ).select('-password');

    res.json({ success: true, student: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Approve student — respond immediately, send email in background
router.put('/students/:id/approve', protect, branchAuth, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!isStudentOwnedByBranch(student, req.user))
      return res.status(403).json({ success: false, message: 'Access denied' });
    const newPassword = 'KCI@' + Math.random().toString(36).slice(-6).toUpperCase();
    student.isApproved = true;
    student.isActive = true;
    student.password = newPassword;
    if (!student.branchId && req.user.role === 'branch') student.branchId = req.user._id;
    await student.save();
    // Send email first, then respond
    await sendStudentApprovalEmail(
      student.email, student.name, student.rollNumber, student.formNo, newPassword,
      req.user.branchName || 'KCI Branch', student.courseName || 'Course'
    );
    res.json({ success: true, message: 'Student approved! Credentials sent via email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Branch: Delete student
router.delete('/students/:id', protect, branchAuth, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!isStudentOwnedByBranch(student, req.user))
      return res.status(403).json({ success: false, message: 'Access denied' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Student: Get own profile + result + certificate
router.get('/student/me', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Student access only' });
    const Result = require('../models/Result');
    const Certificate = require('../models/Certificate');
    const student = await User.findById(req.user._id).select('-password');
    // Build OR conditions for all identifiers
    const certOr = [{ student: req.user._id }];
    if (req.user.rollNumber) certOr.push({ rollNumber: req.user.rollNumber }, { enrollmentNumber: req.user.rollNumber }, { formNo: req.user.rollNumber });
    if (req.user.enrollmentNumber) certOr.push({ enrollmentNumber: req.user.enrollmentNumber }, { rollNumber: req.user.enrollmentNumber }, { formNo: req.user.enrollmentNumber });
    if (req.user.formNo) certOr.push({ formNo: req.user.formNo }, { enrollmentNumber: req.user.formNo }, { rollNumber: req.user.formNo });
    const [results, certificates] = await Promise.all([
      Result.find({ $or: [{ studentId: req.user._id }, { rollNumber: req.user.rollNumber }, { enrollmentNumber: req.user.enrollmentNumber }, { formNo: req.user.formNo }], isApproved: true }).sort('-createdAt'),
      Certificate.find({ $or: certOr, isApproved: true }).sort('-createdAt'),
    ]);
    const branch = (req.user.branchId || req.user.franchiseId)
      ? await User.findById(req.user.branchId || req.user.franchiseId).select('branchName branchCity franchiseCenter franchiseCity phone email')
      : null;
    res.json({ success: true, student, results, certificates, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
