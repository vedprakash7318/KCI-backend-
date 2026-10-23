const router = require('express').Router();
const Result = require('../models/Result');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, admin } = require('../middleware/auth');
const { uploadResultPng } = require('../middleware/cloudinary');

const branchAuth = (req, res, next) => {
  if (req.user && (req.user.role === 'branch' || req.user.role === 'admin')) return next();
  res.status(403).json({ success: false, message: 'Access denied' });
};

// PNG-only multer error handler
const handlePngUpload = (req, res, next) => {
  uploadResultPng.single('resultFile')(req, res, (err) => {
    if (err) {
      const msg = err.message?.includes('ONLY_IMAGE_ALLOWED')
        ? 'Only PNG, JPG, JPEG files are accepted for results.'
        : err.message || 'File upload error';
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
};

// Helper: log audit
async function logAudit(action, user, targetId, details, ip) {
  try {
    await AuditLog.create({
      action, performedBy: user._id, performedByName: user.name,
      performedByRole: user.role, branchId: user.branchId || user._id,
      targetId, targetModel: 'Result', details, ip: ip || 'unknown',
    });
  } catch (_) {}
}

// PUBLIC: Search result by roll number or form number (only published)
router.get('/public/search', async (req, res) => {
  try {
    const { rollNumber, formNo, course, year } = req.query;
    if (!rollNumber && !formNo)
      return res.status(400).json({ success: false, message: 'Provide rollNumber or formNo' });

    const searchStr = (rollNumber || formNo || '').trim();
    const orConditions = [
      { rollNumber: new RegExp(`^${searchStr}$`, 'i') },
      { enrollmentNumber: new RegExp(`^${searchStr}$`, 'i') },
      { formNo: new RegExp(`^${searchStr}$`, 'i') }
    ];

    const mainFilter = {
      $or: orConditions,
      isApproved: true,
      resultFile: { $exists: true, $ne: null, $ne: '' },
    };

    // Apply Course Filter if specified and not 'All Courses'
    if (course && course !== 'All Courses') {
      const cleanCourse = course.trim();
      // Extract short code e.g. "ADCA" from "ADCA (Advanced Diploma...)" or "Advance Diploma... (ADCA)"
      const bracketMatch = cleanCourse.match(/\(([^)]+)\)/);
      const codeMatch = cleanCourse.match(/^([A-[#\]\s]+)/);
      const codeStr = bracketMatch ? bracketMatch[1].trim() : (codeMatch ? codeMatch[1].trim() : cleanCourse);

      mainFilter.$and = mainFilter.$and || [];
      mainFilter.$and.push({
        $or: [
          { courseName: { $regex: cleanCourse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
          { courseName: { $regex: codeStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
        ]
      });
    }

    // Apply Year Filter if specified and not 'All Years'
    if (year && year !== 'All Years') {
      const yNum = parseInt(year.trim(), 10);
      if (!isNaN(yNum)) {
        const startOfYear = new Date(Date.UTC(yNum, 0, 1));
        const endOfYear = new Date(Date.UTC(yNum, 11, 31, 23, 59, 59, 999));

        mainFilter.$and = mainFilter.$and || [];
        mainFilter.$and.push({
          $or: [
            { examDate: { $gte: startOfYear, $lte: endOfYear } },
            { batch: { $regex: year.trim(), $options: 'i' } },
            { createdAt: { $gte: startOfYear, $lte: endOfYear } }
          ]
        });
      }
    }

    const result = await Result.findOne(mainFilter).sort('-createdAt');

    if (!result) {
      // Check if roll number exists under any filter
      const rollExists = await Result.findOne({ $or: orConditions, isApproved: true });
      if (rollExists) {
        return res.status(404).json({
          success: false,
          message: `No result found for Roll No '${searchStr}' with selected Course ('${course || 'All'}') or Year ('${year || 'All'}'). Please verify your filter options.`
        });
      }
      return res.status(404).json({ success: false, message: `No official examination result found for Roll Number / Form No '${searchStr}'.` });
    }

    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Student: get own results — MUST be before /:id
router.get('/my', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Students only' });
    const orConditions = [{ studentId: req.user._id }];
    if (req.user.rollNumber) orConditions.push({ rollNumber: req.user.rollNumber });
    if (req.user.enrollmentNumber) orConditions.push({ enrollmentNumber: req.user.enrollmentNumber });
    if (req.user.formNo) orConditions.push({ formNo: req.user.formNo });

    const results = await Result.find({
      $or: orConditions,
      isApproved: true,
      resultFile: { $exists: true, $ne: null, $ne: '' },
    }).sort('-createdAt');
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET students list for auto-selector (branch's own students)
router.get('/students', protect, branchAuth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { role: 'student' }
      : { role: 'student', branchId: req.user._id };
    const students = await User.find(filter)
      .select('name fatherName courseName batch branchName rollNumber enrollmentNumber formNo _id')
      .sort('name');
    res.json({ success: true, students });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET all results (admin: all, branch: own students only)
router.get('/', protect, branchAuth, async (req, res) => {
  try {
    let results;
    if (req.user.role === 'admin') {
      results = await Result.find().sort('-createdAt');
    } else {
      const students = await User.find({ role: 'student', branchId: req.user._id }).select('_id rollNumber enrollmentNumber formNo');
      const ids = students.map(s => s._id);
      const rolls = students.map(s => s.rollNumber).filter(Boolean);
      const enrolNos = students.map(s => s.enrollmentNumber).filter(Boolean);
      const formNos = students.map(s => s.formNo).filter(Boolean);
      results = await Result.find({
        $or: [
          { studentId: { $in: ids } },
          { branchId: req.user._id },
          ...(rolls.length ? [{ rollNumber: { $in: rolls } }] : []),
          ...(enrolNos.length ? [{ enrollmentNumber: { $in: enrolNos } }] : []),
          ...(formNos.length ? [{ formNo: { $in: formNos } }] : []),
        ],
      }).sort('-createdAt');
    }
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST add result with PNG file
router.post('/', protect, branchAuth, handlePngUpload, async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.resultFile = req.file.path; // Local /uploads/ path
    }
    // Auto-link student
    if (data.studentId) {
      const s = await User.findById(data.studentId).select('branchId branchName rollNumber enrollmentNumber formNo');
      if (s) {
        data.branchId = s.branchId || req.user._id;
        if (!data.rollNumber) data.rollNumber = s.rollNumber;
        if (!data.enrollmentNumber) data.enrollmentNumber = s.enrollmentNumber;
        if (!data.formNo) data.formNo = s.formNo;
      }
    }
    if (!data.branchId) data.branchId = req.user._id;
    data.uploadedBy = req.user._id;
    data.uploadedByRole = req.user.role;

    // Auto-publish if file is uploaded
    if (data.resultFile) {
      data.isApproved = true;
      data.isPublished = true;
    }

    const result = await Result.create(data);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await logAudit('RESULT_UPLOADED', req.user, result._id, {
      studentName: result.studentName, rollNumber: result.rollNumber, courseName: result.courseName,
    }, ip);

    res.status(201).json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT update result with optional PNG replacement
router.put('/:id', protect, branchAuth, handlePngUpload, async (req, res) => {
  try {
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

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await logAudit('RESULT_UPDATED', req.user, result._id, {
      studentName: result.studentName, rollNumber: result.rollNumber,
    }, ip);

    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT publish/hide result
router.put('/:id/approve', protect, branchAuth, async (req, res) => {
  try {
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
      if (!isOwned) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const isApproved = req.body.isApproved !== undefined ? req.body.isApproved : true;
    const result = await Result.findByIdAndUpdate(req.params.id, { isApproved, isPublished: isApproved }, { new: true });

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await logAudit('RESULT_PUBLISHED', req.user, result._id, { isApproved }, ip);

    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE result
router.delete('/:id', protect, branchAuth, async (req, res) => {
  try {
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

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await logAudit('RESULT_DELETED', req.user, req.params.id, {
      studentName: existing.studentName, rollNumber: existing.rollNumber,
    }, ip);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
