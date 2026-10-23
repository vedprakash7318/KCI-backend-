const Certificate = require('../models/Certificate');
const Setting = require('../models/Setting');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const path = require('path');
const fs = require('fs');

async function notifyStudent(enrollmentNumber, formNo, rollNumber, studentId, title, message) {
  try {
    let student = null;
    if (studentId) student = await User.findById(studentId).select('branchId franchiseId');
    if (!student && enrollmentNumber) student = await User.findOne({ enrollmentNumber }).select('branchId franchiseId');
    if (!student && formNo) student = await User.findOne({ formNo }).select('branchId franchiseId');
    if (!student && rollNumber) student = await User.findOne({ rollNumber }).select('branchId franchiseId');
    await Notification.create({
      title, message, type: 'result',
      targetRole: 'student',
      branchId: student?.branchId || student?.franchiseId || null,
      isActive: true,
    });
  } catch (_) { }
}

async function logAudit(action, user, targetId, details, ip) {
  try {
    await AuditLog.create({
      action, performedBy: user._id, performedByName: user.name,
      performedByRole: user.role, branchId: user.branchId || user._id,
      targetId, targetModel: 'Certificate', details, ip: ip || 'unknown',
    });
  } catch (_) { }
}

const makeTemplateHandlers = (key) => ({
  get: async (req, res) => {
    try {
      const s = await Setting.findOne({ key });
      res.json({ success: true, templateUrl: s ? s.value : null });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
  upload: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
      const url = req.file.path || `/uploads/${req.file.filename}`;
      await Setting.findOneAndUpdate({ key }, { key, value: url }, { upsert: true, new: true });
      res.json({ success: true, templateUrl: url });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },
});

const certTpl = makeTemplateHandlers('certificateTemplate');
const idCardTpl = makeTemplateHandlers('idCardTemplate');

exports.getTemplate = certTpl.get;
exports.uploadTemplate = certTpl.upload;
exports.getIdCardTemplate = idCardTpl.get;
exports.uploadIdCardTemplate = idCardTpl.upload;

exports.verifyCertificate = async (req, res) => {
  try {
    const searchKey = (req.params.certNumber || req.query.roll || req.query.formNo || req.query.cert || '').trim();

    if (!searchKey || searchKey === 'undefined' || searchKey === 'null') {
      return res.status(400).json({ success: false, message: 'Please provide a valid Certificate No., Roll No., or Form No.' });
    }

    // 1. Search in Certificate collection first
    let cert = await Certificate.findOne({
      $or: [
        { certificateNumber: searchKey },
        { certificateNumber: new RegExp('^' + searchKey.replace(/[^a-zA-Z0-9]/g, '\\$&') + '$', 'i') },
        { rollNumber: searchKey },
        { enrollmentNumber: searchKey },
        { formNo: searchKey },
      ],
    }).populate('course', 'title');

    if (cert) {
      return res.json({ success: true, certificate: cert });
    }

    // 2. Fallback: Search in User (Student) collection by Roll No, Enrollment No, or Form No
    const student = await User.findOne({
      $or: [
        { rollNumber: searchKey },
        { enrollmentNumber: searchKey },
        { formNo: searchKey },
        { email: searchKey.toLowerCase() },
      ],
      role: 'student',
    }).populate('branchId', 'branchName');

    if (student) {
      // Return a verified student certificate/identity record
      const studentCertRecord = {
        _id: student._id,
        certificateNumber: student.enrollmentNumber || student.rollNumber || student.formNo || 'VERIFIED-STUDENT',
        studentName: student.name,
        fatherName: student.fatherName || '—',
        courseName: student.courseName || student.course || 'Certificate Program',
        issueDate: student.admissionDate || student.createdAt,
        grade: 'Verified Record',
        isValid: true,
        isStudentRecord: true,
        rollNumber: student.rollNumber,
        enrollmentNumber: student.enrollmentNumber,
        formNo: student.formNo,
        branchName: student.branchId?.branchName || 'Main Campus',
      };
      return res.json({ success: true, certificate: studentCertRecord });
    }

    return res.status(404).json({ success: false, message: `No matching record found for "${searchKey}"` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findOne({
      $or: [
        { enrollmentNumber: req.user.enrollmentNumber },
        { formNo: req.user.formNo },
        { rollNumber: req.user.rollNumber },
        { student: req.user._id },
      ].filter(c => Object.values(c)[0]),
      isApproved: true,
      certificateFile: { $exists: true, $ne: null, $ne: '' },
    }).populate('course', 'title');
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not yet issued. Please contact the institute administration.' });
    res.json({ success: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyCertificates = async (req, res) => {
  try {
    const orConditions = [{ student: req.user._id }];
    if (req.user.enrollmentNumber) {
      orConditions.push({ enrollmentNumber: req.user.enrollmentNumber });
      orConditions.push({ formNo: req.user.enrollmentNumber });
      orConditions.push({ rollNumber: req.user.enrollmentNumber });
    }
    if (req.user.formNo) {
      orConditions.push({ formNo: req.user.formNo });
      orConditions.push({ enrollmentNumber: req.user.formNo });
      orConditions.push({ rollNumber: req.user.formNo });
    }
    if (req.user.rollNumber) {
      orConditions.push({ rollNumber: req.user.rollNumber });
      orConditions.push({ enrollmentNumber: req.user.rollNumber });
      orConditions.push({ formNo: req.user.rollNumber });
    }
    const certs = await Certificate.find({
      $or: orConditions,
      isApproved: true,
      certificateFile: { $exists: true, $ne: null, $ne: '' },
    }).populate('course', 'title').sort({ createdAt: -1 });
    res.json({ success: true, certificates: certs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find().populate('course', 'title').sort({ createdAt: -1 });
    res.json({ success: true, certificates: certs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCertificate = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.certificateFile = req.file.path;
    if (!data.enrollmentNumber && data.formNo) data.enrollmentNumber = data.formNo;
    if (!data.rollNumber && data.formNo) data.rollNumber = data.formNo;
    if (!data.formNo && data.enrollmentNumber) data.formNo = data.enrollmentNumber;

    data.issuedBy = req.user._id;
    data.issuedByRole = req.user.role;

    // Auto-publish if file uploaded
    if (data.certificateFile) {
      data.isApproved = true;
      data.isPublished = true;
    }

    // Try to link student
    if (!data.student) {
      const q = [];
      if (data.enrollmentNumber) q.push({ enrollmentNumber: data.enrollmentNumber });
      if (data.formNo) q.push({ formNo: data.formNo });
      if (data.rollNumber) q.push({ rollNumber: data.rollNumber });
      if (q.length) {
        const s = await User.findOne({ $or: q, role: 'student' });
        if (s) {
          data.student = s._id;
          if (!data.branchId && s.branchId) data.branchId = s.branchId;
        }
      }
    }

    const cert = await Certificate.create(data);

    await notifyStudent(
      cert.enrollmentNumber, cert.formNo, cert.rollNumber, cert.student,
      '🏅 Certificate Uploaded',
      `Your certificate for ${cert.courseName} has been uploaded. You can now view and download it from your Student Dashboard.`
    );

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await logAudit('CERTIFICATE_GENERATED', req.user, cert._id, {
      studentName: cert.studentName, enrollmentNumber: cert.enrollmentNumber,
      formNo: cert.formNo, courseName: cert.courseName,
    }, ip);

    res.status(201).json({ success: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCertificate = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.certificateFile = req.file.path;
      data.isApproved = true;
      data.isPublished = true;
    }
    if (!data.enrollmentNumber && data.formNo) data.enrollmentNumber = data.formNo;
    if (!data.rollNumber && data.formNo) data.rollNumber = data.formNo;
    if (!data.formNo && data.enrollmentNumber) data.formNo = data.enrollmentNumber;

    const cert = await Certificate.findByIdAndUpdate(req.params.id, data, { new: true });

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await logAudit('CERTIFICATE_UPDATED', req.user, cert._id, {
      studentName: cert.studentName, certificateNumber: cert.certificateNumber,
    }, ip);

    res.json({ success: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveCertificate = async (req, res) => {
  try {
    const isApproved = req.body.isApproved !== undefined ? req.body.isApproved : true;
    const cert = await Certificate.findByIdAndUpdate(req.params.id, { isApproved, isPublished: isApproved }, { new: true });
    if (!cert) return res.status(404).json({ success: false, message: 'Not found' });

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await logAudit('CERTIFICATE_PUBLISHED', req.user, cert._id, { isApproved }, ip);

    res.json({ success: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Not found' });

    await Certificate.findByIdAndDelete(req.params.id);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await logAudit('CERTIFICATE_DELETED', req.user, req.params.id, {
      studentName: cert.studentName, certificateNumber: cert.certificateNumber,
    }, ip);

    res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
