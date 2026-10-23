const Admission = require('../models/Admission');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const generateStudentNumbers = require('../utils/generateStudentNumbers');

async function generateEnrollmentId() {
  const count = await Admission.countDocuments({ enrollmentId: { $exists: true, $ne: null } });
  return `KCI-ENR-${String(count + 1).padStart(4, '0')}`;
}

async function logAudit(action, user, targetId, targetModel, details, ip) {
  try {
    await AuditLog.create({
      action,
      performedBy: user._id,
      performedByName: user.name,
      performedByRole: user.role,
      targetId,
      targetModel,
      details,
      ip: ip || 'unknown',
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}

exports.editAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });
    if (req.user.role === 'branch') {
      const ownedByBranch = admission.branchId?.toString() === req.user._id.toString() ||
        admission.franchise?.toString() === req.user._id.toString();
      if (!ownedByBranch) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const allowed = ['name', 'email', 'phone', 'address', 'fatherName', 'batch', 'course', 'qualification', 'dob', 'gender', 'message', 'formNo', 'session', 'rollNumber', 'enrollmentNumber'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const updated = await Admission.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('course', 'title')
      .populate('verifiedBy', 'name role')
      .populate('approvedBy', 'name role');
    res.json({ success: true, admission: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitAdmission = async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.franchise;
    if (data.branchId) {
      const branch = await User.findOne({ _id: data.branchId, role: 'branch', isApproved: true }).lean();
      if (!branch) delete data.branchId;
    }
    data.status = 'Pending Approval';
    if (req.file) data.photo = req.file.path;
    const admission = await Admission.create(data);
    if (req.user) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
      await logAudit('ADMISSION_CREATED', req.user, admission._id, 'Admission', { studentName: admission.name, email: admission.email }, ip);
    }
    res.status(201).json({ success: true, message: 'Admission form submitted successfully!', admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAdmissions = async (req, res) => {
  try {
    const admissions = await Admission.find()
      .populate('course', 'title')
      .populate('franchise', 'name franchiseCenter franchiseCity')
      .populate('branchId', 'branchName branchCity branchCode name')
      .populate('verifiedBy', 'name role')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, admissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFranchiseAdmissions = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? {}
      : { $or: [{ branchId: req.user._id }, { franchise: req.user._id }] };
    const admissions = await Admission.find(filter)
      .populate('course', 'title')
      .populate('branchId', 'branchName branchCity branchCode')
      .sort({ createdAt: -1 });
    res.json({ success: true, admissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAdmissionStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const user = req.user;

    const admission = await Admission.findById(req.params.id)
      .populate('course', 'title')
      .populate('franchise', 'franchiseCenter franchiseCity')
      .populate('branchId', 'branchName branchCity branchCode name');
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    const isAdmin = user.role === 'admin';
    const isBranchOrAdmin = user.role === 'admin' || user.role === 'branch';

    if (user.role === 'branch') {
      const owned = admission.branchId?._id?.toString() === user._id.toString() ||
        admission.branchId?.toString() === user._id.toString() ||
        admission.franchise?.toString() === user._id.toString();
      if (!owned) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (status === 'Verified') {
      if (!isBranchOrAdmin) return res.status(403).json({ success: false, message: 'Branch Manager or Admin required to verify' });
      admission.status = 'Verified';
      admission.verifiedBy = user._id;
      admission.verifiedAt = new Date();
      await admission.save();
      const ipV = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
      await logAudit('ADMISSION_VERIFIED', user, admission._id, 'Admission', { studentName: admission.name }, ipV);
      return res.json({ success: true, admission });
    }

    if (status === 'Approved' && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only Admin can give final approval' });
    }

    if (status === 'Rejected' && !isBranchOrAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject' });
    }

    admission.status = status;
    if (rejectionReason) admission.rejectionReason = rejectionReason;

    if (status === 'Approved') {
      admission.approvedBy = user._id;
      admission.approvedAt = new Date();

      if (!admission.enrollmentId) {
        const enrollmentId = await generateEnrollmentId();
        admission.enrollmentId = enrollmentId;

        const existingUser = await User.findOne({ email: admission.email });
        if (!existingUser) {
          const { rollNumber, enrollmentNumber, registrationNumber, formNo: generatedFormNo } = await generateStudentNumbers();
          const password = 'KCI@' + Math.random().toString(36).slice(-6).toUpperCase();
          const courseName = admission.course?.title || '';
          const center = admission.franchise?.franchiseCenter || admission.branchId?.branchName || 'KCI';
          const studentBranchId = admission.branchId?._id || admission.branchId || null;
          const branchName = admission.branchId?.branchName || '';
          const branchCity = admission.branchId?.branchCity || '';
          const branchCode = admission.branchId?.branchCode || '';

          const student = await User.create({
            name: admission.name,
            email: admission.email,
            password,
            phone: admission.phone,
            address: admission.address,
            dob: admission.dob,
            gender: admission.gender,
            fatherName: admission.fatherName || '',
            rollNumber,
            enrollmentNumber,
            registrationNumber,
            formNo: admission.formNo || generatedFormNo,
            courseName,
            course: admission.course?._id || admission.course,
            franchiseId: admission.franchise?._id || admission.franchise,
            branchId: studentBranchId,
            branchName,
            branchCity,
            branchCode,
            franchiseCenter: center,
            franchiseCity: admission.franchise?.franchiseCity,
            photo: admission.photo || '',
            role: 'student',
            isApproved: true,
            isActive: true,
            admissionDate: new Date(),
          });

          admission.studentUserId = student._id;
          await admission.save();

          Notification.create({
            title: '🎉 Admission Approved!',
            message: `Dear ${admission.name}, your admission for ${courseName} has been approved. Enrollment No: ${student.enrollmentNumber}, Roll No: ${student.rollNumber}. Welcome to KCI!`,
            type: 'admission',
            targetRole: 'specific',
            targetStudents: [student._id],
            branchId: studentBranchId,
            createdBy: user._id,
          }).catch(() => {});

          const ipA = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
          await logAudit('ADMISSION_APPROVED', user, admission._id, 'Admission', { studentName: admission.name, enrollmentId }, ipA);
          return res.json({ success: true, admission });

        } else {
          const updates = {};
          if (!existingUser.branchId && admission.branchId) {
            updates.branchId = admission.branchId?._id || admission.branchId;
            updates.branchName = admission.branchId?.branchName || '';
            updates.branchCity = admission.branchId?.branchCity || '';
            updates.branchCode = admission.branchId?.branchCode || '';
          }
          if (Object.keys(updates).length > 0) await User.findByIdAndUpdate(existingUser._id, updates);
          admission.studentUserId = existingUser._id;
          await admission.save();

          const ipA2 = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
          await logAudit('ADMISSION_APPROVED', user, admission._id, 'Admission', { studentName: admission.name }, ipA2);
          return res.json({ success: true, admission });
        }
      }
    }

    if (status === 'Rejected') {
      const ipR = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
      await logAudit('ADMISSION_REJECTED', user, admission._id, 'Admission', { studentName: admission.name, reason: rejectionReason }, ipR);
    }

    await admission.save();
    res.json({ success: true, admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteAdmission = async (req, res) => {
  try {
    await Admission.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Admission deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
