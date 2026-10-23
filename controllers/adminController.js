const User = require('../models/User');
const Course = require('../models/Course');
const Admission = require('../models/Admission');
const Result = require('../models/Result');
const Certificate = require('../models/Certificate');
const Contact = require('../models/Contact');
const generateStudentNumbers = require('../utils/generateStudentNumbers');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendApprovalEmail(student) {
  try {
    await transporter.sendMail({
      from: `"Keerti Computer Institute" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: '✅ Your KCI Account is Approved!',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);padding:32px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:24px">Account Approved!</h1>
            <p style="color:#bfdbfe;margin:8px 0 0">Keerti Computer Institute</p>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;color:#111">Dear <strong>${student.name}</strong>,</p>
            <p style="color:#374151">Your student account has been approved. You can now login to the student portal.</p>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0">
              <h3 style="margin:0 0 12px;color:#1d4ed8">Your Login Details</h3>
              <p style="margin:6px 0;color:#374151"><strong>Email:</strong> ${student.email}</p>
              <p style="margin:6px 0;color:#374151"><strong>Roll Number:</strong> <code style="background:#dbeafe;padding:2px 10px;border-radius:4px;font-size:15px;font-weight:bold">${student.rollNumber}</code></p>
              <p style="margin:6px 0;color:#374151"><strong>Enrollment No:</strong> ${student.enrollmentNumber || '-'}</p>
              <p style="margin:6px 0;color:#374151"><strong>Course:</strong> ${student.courseName || '-'}</p>
            </div>
            <p style="color:#374151">Login at: <a href="${process.env.FRONTEND_URL || 'https://kci-seven.vercel.app'}/login" style="color:#1d4ed8;font-weight:bold">KCI Student Portal</a></p>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px">
            Keerti Computer Institute | 9936384736
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('Approval email failed:', err.message);
  }
}

const monthlyAgg = (Model, field = 'createdAt') => Model.aggregate([
  { $group: { _id: { month: { $month: `$${field}` }, year: { $year: `$${field}` } }, count: { $sum: 1 } } },
  { $sort: { '_id.year': 1, '_id.month': 1 } },
  { $limit: 6 },
]);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [students, courses, admissions, pendingAdmissions, approvedAdmissions, results, certificates, unreadContacts,
      admissionMonthly, resultMonthly, courseCategories,
      todayStudents, weekStudents, monthStudents, yearStudents,
      branchList
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Course.countDocuments({ isActive: true }),
      Admission.countDocuments(),
      Admission.countDocuments({ status: { $in: ['Pending', 'Pending Approval'] } }),
      Admission.countDocuments({ status: 'Approved' }),
      Result.countDocuments(),
      Certificate.countDocuments(),
      Contact.countDocuments({ isRead: false }),
      monthlyAgg(Admission),
      monthlyAgg(Result),
      Course.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      User.countDocuments({ role: 'student', createdAt: { $gte: todayStart } }),
      User.countDocuments({ role: 'student', createdAt: { $gte: weekStart } }),
      User.countDocuments({ role: 'student', createdAt: { $gte: monthStart } }),
      User.countDocuments({ role: 'student', createdAt: { $gte: yearStart } }),
      User.find({ role: 'branch', isApproved: true }).select('_id branchName branchCity branchCode name').lean(),
    ]);

    // Branch-wise performance
    const branchIds = branchList.map(b => b._id);
    const [branchStudentCounts, branchAdmissionCounts, branchResultCounts, branchCertCounts, branchLoginActivity] = await Promise.all([
      User.aggregate([{ $match: { role: 'student', branchId: { $in: branchIds } } }, { $group: { _id: '$branchId', count: { $sum: 1 }, approved: { $sum: { $cond: ['$isApproved', 1, 0] } }, thisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, 1, 0] } } } }]),
      Admission.aggregate([{ $match: { branchId: { $in: branchIds } } }, { $group: { _id: '$branchId', count: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } } } }]),
      Result.aggregate([{ $match: {} }, { $group: { _id: null, rollNumbers: { $push: '$rollNumber' } } }]).then(async () => {
        return User.aggregate([
          { $match: { role: 'student', branchId: { $in: branchIds } } },
          { $lookup: { from: 'results', localField: 'rollNumber', foreignField: 'rollNumber', as: 'results' } },
          { $group: { _id: '$branchId', count: { $sum: { $size: '$results' } } } },
        ]);
      }),
      User.aggregate([
        { $match: { role: 'student', branchId: { $in: branchIds } } },
        { $lookup: { from: 'certificates', localField: 'rollNumber', foreignField: 'rollNumber', as: 'certs' } },
        { $group: { _id: '$branchId', count: { $sum: { $size: '$certs' } } } },
      ]),
      // Login activity: students logged in last 7 days (using updatedAt as proxy)
      User.aggregate([{ $match: { role: 'student', branchId: { $in: branchIds }, updatedAt: { $gte: weekStart } } }, { $group: { _id: '$branchId', count: { $sum: 1 } } }]),
    ]);

    const toMap = (arr) => { const m = {}; arr.forEach(x => { m[x._id?.toString()] = x; }); return m; };
    const scMap = toMap(branchStudentCounts);
    const acMap = toMap(branchAdmissionCounts);
    const rcMap = toMap(branchResultCounts);
    const ccMap = toMap(branchCertCounts);
    const laMap = toMap(branchLoginActivity);

    const branchPerformance = branchList.map(b => {
      const id = b._id.toString();
      return {
        _id: b._id,
        branchName: b.branchName,
        branchCity: b.branchCity,
        branchCode: b.branchCode,
        managerName: b.name,
        students: scMap[id]?.count || 0,
        approvedStudents: scMap[id]?.approved || 0,
        newStudentsThisMonth: scMap[id]?.thisMonth || 0,
        admissions: acMap[id]?.count || 0,
        approvedAdmissions: acMap[id]?.approved || 0,
        results: rcMap[id]?.count || 0,
        certificates: ccMap[id]?.count || 0,
        recentActivity: laMap[id]?.count || 0,
      };
    });

    const toChartData = (agg) => agg.map(d => ({ name: MONTHS[d._id.month - 1], count: d.count }));

    res.json({
      success: true,
      stats: { students, courses, admissions, pendingAdmissions, approvedAdmissions, results, certificates, unreadContacts,
        todayStudents, weekStudents, monthStudents, yearStudents,
        activeBranches: branchList.length,
        franchiseRenewals: await User.countDocuments({ role: 'branch', isApproved: true, renewalDate: { $lte: new Date(Date.now() + 30*24*60*60*1000), $gte: new Date() } }),
      },
      charts: {
        admissions: toChartData(admissionMonthly),
        results: toChartData(resultMonthly),
        courseCategories: courseCategories.map(d => ({ name: d._id || 'Other', value: d.count })),
      },
      branchPerformance,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { name, email, password, phone, batch, courseName, fatherName, dob, address } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Use manually provided numbers or auto-generate
    let rollNumber, enrollmentNumber, registrationNumber, formNo;
    if (req.body.rollNumber?.trim() || req.body.enrollmentNumber?.trim() || req.body.formNo?.trim()) {
      const auto = await generateStudentNumbers();
      rollNumber = req.body.rollNumber?.trim() || auto.rollNumber;
      enrollmentNumber = req.body.enrollmentNumber?.trim() || auto.enrollmentNumber;
      registrationNumber = auto.registrationNumber;
      formNo = req.body.formNo?.trim() || auto.formNo;
    } else {
      ({ rollNumber, enrollmentNumber, registrationNumber, formNo } = await generateStudentNumbers());
    }

    const photo = req.file ? req.file.path : undefined;
    const student = await User.create({ name, email, password, phone, batch, courseName, fatherName, dob, address, rollNumber, enrollmentNumber, registrationNumber, formNo, role: 'student', ...(req.body.branchId && { branchId: req.body.branchId }), ...(photo && { photo }) });

    // Audit log
    try {
      const AuditLog = require('../models/AuditLog');
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
      await AuditLog.create({
        action: 'STUDENT_CREATED',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        targetId: student._id,
        targetModel: 'User',
        details: { studentName: student.name, email: student.email, rollNumber },
        ip,
      });
    } catch {}

    res.status(201).json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .populate('course', 'title')
      .populate('branchId', 'branchName branchCode branchCity name')
      .sort({ createdAt: -1 });
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const allowed = ['name', 'email', 'phone', 'batch', 'courseName', 'fatherName', 'dob', 'address', 'admissionDate', 'branchId', 'rollNumber', 'enrollmentNumber', 'formNo'];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] === undefined) return;
      // Don't overwrite date fields with empty string
      if ((f === 'admissionDate' || f === 'dob') && req.body[f] === '') return;
      updates[f] = req.body[f];
    });

    const prevStudent = await User.findById(req.params.id).select('isApproved email');
    const beingApproved = (req.body.isApproved === 'true' || req.body.isApproved === true) && !prevStudent?.isApproved;

    if (req.body.isApproved !== undefined) updates.isApproved = req.body.isApproved === 'true' || req.body.isApproved === true;
    if (req.file) updates.photo = req.file.path;
    if (req.body.password && req.body.password.trim()) {
      const bcrypt = require('bcryptjs');
      updates.password = await bcrypt.hash(req.body.password.trim(), 10);
    }
    const student = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: false }).select('-password');

    // Send approval email only when isApproved changes false -> true
    if (beingApproved && student?.email) {
      await sendApprovalEmail(student);
    }

    // Audit log
    try {
      const AuditLog = require('../models/AuditLog');
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
      await AuditLog.create({
        action: 'STUDENT_UPDATED',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        targetId: student._id,
        targetModel: 'User',
        details: { studentName: student.name, email: student.email },
        ip,
      });
    } catch {}

    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const branchList = await User.find({ role: 'branch', isApproved: true })
      .select('_id branchName branchCity branchCode name email branchPhone').lean();
    const branchIds = branchList.map(b => b._id);

    // Global student counts
    const [totalStudents, todayStudents, weekStudents, monthStudents, yearStudents] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', createdAt: { $gte: todayStart } }),
      User.countDocuments({ role: 'student', createdAt: { $gte: weekStart } }),
      User.countDocuments({ role: 'student', createdAt: { $gte: monthStart } }),
      User.countDocuments({ role: 'student', createdAt: { $gte: yearStart } }),
    ]);

    // Monthly student registrations (last 12 months)
    const monthlyStudents = await User.aggregate([
      { $match: { role: 'student', createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Login activity: last 30 days daily logins (using updatedAt as proxy)
    const loginActivity = await User.aggregate([
      { $match: { role: 'student', updatedAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Branch-wise aggregations
    const [branchStudents, branchAdmissions, branchResults, branchCerts, branchWeeklyLogins, branchMonthlyStudents] = await Promise.all([
      User.aggregate([
        { $match: { role: 'student', branchId: { $in: branchIds } } },
        { $group: { _id: '$branchId', total: { $sum: 1 }, approved: { $sum: { $cond: ['$isApproved', 1, 0] } }, today: { $sum: { $cond: [{ $gte: ['$createdAt', todayStart] }, 1, 0] } }, week: { $sum: { $cond: [{ $gte: ['$createdAt', weekStart] }, 1, 0] } }, month: { $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, 1, 0] } }, year: { $sum: { $cond: [{ $gte: ['$createdAt', yearStart] }, 1, 0] } } } },
      ]),
      Admission.aggregate([
        { $match: { branchId: { $in: branchIds } } },
        { $group: { _id: '$branchId', total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } } } },
      ]),
      User.aggregate([
        { $match: { role: 'student', branchId: { $in: branchIds } } },
        { $lookup: { from: 'results', localField: 'rollNumber', foreignField: 'rollNumber', as: 'r' } },
        { $group: { _id: '$branchId', count: { $sum: { $size: '$r' } } } },
      ]),
      User.aggregate([
        { $match: { role: 'student', branchId: { $in: branchIds } } },
        { $lookup: { from: 'certificates', localField: 'rollNumber', foreignField: 'rollNumber', as: 'c' } },
        { $group: { _id: '$branchId', count: { $sum: { $size: '$c' } } } },
      ]),
      // Weekly login activity per branch
      User.aggregate([
        { $match: { role: 'student', branchId: { $in: branchIds }, updatedAt: { $gte: weekStart } } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } },
      ]),
      // Monthly new students per branch
      User.aggregate([
        { $match: { role: 'student', branchId: { $in: branchIds }, createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } } },
        { $group: { _id: { branchId: '$branchId', month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const toMap = (arr, key = '_id') => { const m = {}; arr.forEach(x => { m[x[key]?.toString()] = x; }); return m; };
    const bsMap = toMap(branchStudents);
    const baMap = toMap(branchAdmissions);
    const brMap = toMap(branchResults);
    const bcMap = toMap(branchCerts);
    const blMap = toMap(branchWeeklyLogins);

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const branchPerformance = branchList.map(b => {
      const id = b._id.toString();
      const monthlyData = branchMonthlyStudents
        .filter(x => x._id.branchId?.toString() === id)
        .map(x => ({ name: MONTHS[x._id.month - 1], count: x.count }));
      return {
        _id: b._id,
        branchName: b.branchName || b.name,
        branchCity: b.branchCity,
        branchCode: b.branchCode,
        managerName: b.name,
        email: b.email,
        phone: b.branchPhone,
        students: { total: bsMap[id]?.total || 0, approved: bsMap[id]?.approved || 0, today: bsMap[id]?.today || 0, week: bsMap[id]?.week || 0, month: bsMap[id]?.month || 0, year: bsMap[id]?.year || 0 },
        admissions: { total: baMap[id]?.total || 0, approved: baMap[id]?.approved || 0, pending: baMap[id]?.pending || 0 },
        results: brMap[id]?.count || 0,
        certificates: bcMap[id]?.count || 0,
        loginActivity: blMap[id]?.count || 0,
        monthlyStudents: monthlyData,
      };
    });

    res.json({
      success: true,
      global: { totalStudents, todayStudents, weekStudents, monthStudents, yearStudents },
      monthlyStudents: monthlyStudents.map(d => ({ name: MONTHS[d._id.month - 1], year: d._id.year, count: d.count })),
      loginActivity: loginActivity.map(d => ({ date: d._id, count: d.count })),
      branchPerformance,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMonthlyStudentsDetail = async (req, res) => {
  try {
    const now = new Date();
    const since = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const match = { role: 'student', createdAt: { $gte: since } };
    if (req.query.branchId) match.branchId = require('mongoose').Types.ObjectId.createFromHexString(req.query.branchId);

    const students = await User.find(match)
      .populate('branchId', 'branchName branchCode branchCity')
      .select('name email phone rollNumber enrollmentNumber registrationNumber formNo courseName batch fatherName dob address isApproved createdAt branchId')
      .sort({ createdAt: -1 })
      .lean();

    const rows = students.map(s => ({
      'Registration Month': `${MONTHS[new Date(s.createdAt).getMonth()]} ${new Date(s.createdAt).getFullYear()}`,
      'Registration Date': new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      'Name': s.name || '',
      'Email': s.email || '',
      'Phone': s.phone || '',
      'Roll Number': s.rollNumber || '',
      'Enrollment No': s.enrollmentNumber || '',
      'Registration No': s.registrationNumber || '',
      'Form No': s.formNo || '',
      'Course': s.courseName || '',
      'Batch': s.batch || '',
      'Father Name': s.fatherName || '',
      'DOB': s.dob ? new Date(s.dob).toLocaleDateString('en-IN') : '',
      'Address': s.address || '',
      'Status': s.isApproved ? 'Approved' : 'Pending',
      'Branch': s.branchId?.branchName || 'Direct',
      'Branch Code': s.branchId?.branchCode || '',
      'Branch City': s.branchId?.branchCity || '',
    }));

    res.json({ success: true, rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBranchUsers = async (req, res) => {
  try {
    const branches = await User.find({ role: 'branch' }).select('name branchName branchCode branchCity').sort({ branchName: 1 });
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await User.findByIdAndDelete(req.params.id);
    if (student) {
      try {
        const AuditLog = require('../models/AuditLog');
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
        await AuditLog.create({
          action: 'STUDENT_DELETED',
          performedBy: req.user._id,
          performedByName: req.user.name,
          performedByRole: req.user.role,
          targetId: student._id,
          targetModel: 'User',
          details: { studentName: student.name, email: student.email },
          ip,
        });
      } catch {}
    }
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Universal Student Search — search by any identifier
exports.universalStudentSearch = async (req, res) => {
  try {
    const { q, session, course, branch, admissionStatus, resultStatus, certGenerated } = req.query;
    if (!q && !session && !course && !branch) return res.status(400).json({ success: false, message: 'Provide search query' });

    const conditions = [];
    if (q) {
      const regex = new RegExp(q, 'i');
      conditions.push(
        { name: regex },
        { email: regex },
        { phone: regex },
        { rollNumber: regex },
        { enrollmentNumber: regex },
        { formNo: regex },
        { fatherName: regex },
        { branchName: regex },
        { courseName: regex },
        { batch: regex },
      );
    }

    const filter = { role: 'student' };
    if (conditions.length) filter.$or = conditions;
    if (session) filter.batch = new RegExp(session, 'i');
    if (course) filter.courseName = new RegExp(course, 'i');
    if (branch) filter.branchName = new RegExp(branch, 'i');
    if (admissionStatus === 'approved') filter.isApproved = true;
    if (admissionStatus === 'pending') filter.isApproved = false;

    let students = await User.find(filter)
      .populate('branchId', 'branchName branchCode branchCity')
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Filter by admission workflow status (Pending Approval, Verified, Approved, Rejected, Draft)
    const workflowStatuses = ['Draft', 'Pending Approval', 'Verified', 'Approved', 'Rejected'];
    if (admissionStatus && workflowStatuses.includes(admissionStatus)) {
      const emails = students.map(s => s.email).filter(Boolean);
      const admissions = await Admission.find({ email: { $in: emails }, status: admissionStatus }).select('email status');
      const matchedEmails = new Set(admissions.map(a => a.email));
      students = students.filter(s => matchedEmails.has(s.email));
    }

    // Optionally filter by result/cert status
    if (resultStatus || certGenerated) {
      const Result = require('../models/Result');
      const Certificate = require('../models/Certificate');
      const rollNumbers = students.map(s => s.rollNumber).filter(Boolean);

      if (resultStatus === 'uploaded') {
        const results = await Result.find({ rollNumber: { $in: rollNumbers } }).select('rollNumber');
        const withResult = new Set(results.map(r => r.rollNumber));
        students = students.filter(s => withResult.has(s.rollNumber));
      } else if (resultStatus === 'not_uploaded') {
        const results = await Result.find({ rollNumber: { $in: rollNumbers } }).select('rollNumber');
        const withResult = new Set(results.map(r => r.rollNumber));
        students = students.filter(s => !withResult.has(s.rollNumber));
      }

      if (certGenerated === 'yes') {
        const certs = await Certificate.find({ rollNumber: { $in: rollNumbers } }).select('rollNumber');
        const withCert = new Set(certs.map(c => c.rollNumber));
        students = students.filter(s => withCert.has(s.rollNumber));
      } else if (certGenerated === 'no') {
        const certs = await Certificate.find({ rollNumber: { $in: rollNumbers } }).select('rollNumber');
        const withCert = new Set(certs.map(c => c.rollNumber));
        students = students.filter(s => !withCert.has(s.rollNumber));
      }
    }

    res.json({ success: true, students, count: students.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const { action, module: mod, limit = 500, page = 1 } = req.query;
    const MODULE_ACTIONS = {
      Admissions: ['ADMISSION_APPROVED','ADMISSION_REJECTED','ADMISSION_VERIFIED','ADMISSION_CREATED'],
      Results: ['RESULT_UPLOADED','RESULT_UPDATED','RESULT_DELETED'],
      Students: ['STUDENT_UPDATED','STUDENT_CREATED','STUDENT_DELETED'],
      Certificates: ['CERTIFICATE_GENERATED'],
      Auth: ['LOGIN'],
    };
    const filter = {};
    if (action) filter.action = action;
    else if (mod && MODULE_ACTIONS[mod]) filter.action = { $in: MODULE_ACTIONS[mod] };
    const logs = await AuditLog.find(filter)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
