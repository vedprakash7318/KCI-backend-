const router = require('express').Router();
const {
  verifyCertificate, getMyCertificate, getMyCertificates, getAllCertificates,
  createCertificate, updateCertificate, deleteCertificate, approveCertificate,
  getTemplate, uploadTemplate, getIdCardTemplate, uploadIdCardTemplate,
} = require('../controllers/certificateController');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadCertificatePng } = require('../middleware/cloudinary');
const Setting = require('../models/Setting');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const path = require('path');

// PNG-only multer error handler
const handlePngUpload = (req, res, next) => {
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

const branchOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'branch')) return next();
  res.status(403).json({ success: false, message: 'Access denied' });
};

router.get('/template', protect, admin, getTemplate);
router.post('/template', protect, admin, upload.single('template'), uploadTemplate);
router.get('/idcard-template', protect, admin, getIdCardTemplate);
router.post('/idcard-template', protect, admin, upload.single('template'), uploadIdCardTemplate);
router.get('/idcard-template/public', getIdCardTemplate);

// ID Card Settings
router.get('/idcard-settings', async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'idCardSettings' });
    res.json({ success: true, settings: s ? s.value : {} });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/idcard-settings', protect, admin, async (req, res) => {
  try {
    await Setting.findOneAndUpdate({ key: 'idCardSettings' }, { key: 'idCardSettings', value: req.body }, { upsert: true, new: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Named download endpoint
router.get('/download/:id', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id).select('certificateFile certificateNumber studentName');
    if (!cert?.certificateFile) return res.status(404).json({ success: false, message: 'File not found' });
    const ext = path.extname(cert.certificateFile) || '.png';
    const safeName = (cert.studentName || 'Student').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const safeCertNo = (cert.certificateNumber || cert._id.toString()).replace(/[\/\\]/g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `KCI_Certificate_${safeName}_${safeCertNo}${ext}`;
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', cert.certificateFile);
    if (!fs.existsSync(filePath)) {
      const staticUrl = cert.certificateFile.startsWith('/') ? cert.certificateFile : `/${cert.certificateFile}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.redirect(staticUrl);
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUBLIC: Verify by cert number or form number
router.get('/verify/:certNumber', verifyCertificate);

// PUBLIC: Verify by form number (alternative)
router.get('/verify-by-form/:formNo', async (req, res) => {
  try {
    const cert = await Certificate.findOne({
      $or: [
        { formNo: req.params.formNo },
        { enrollmentNumber: req.params.formNo },
        { rollNumber: req.params.formNo },
      ],
      isApproved: true,
    }).populate('course', 'title');
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });
    res.json({ success: true, certificate: cert });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/my-all', protect, getMyCertificates);
router.get('/my', protect, getMyCertificate);

// Admin: Get all certificates
router.get('/', protect, admin, getAllCertificates);

// Admin: Create certificate (PNG only)
router.post('/', protect, admin, handlePngUpload, createCertificate);

// Admin: Update certificate (PNG only)
router.put('/:id/approve', protect, admin, approveCertificate);
router.put('/:id', protect, admin, handlePngUpload, updateCertificate);

// Admin: Delete certificate
router.delete('/:id', protect, admin, deleteCertificate);

// Branch: Get own certificates
router.get('/branch/list', protect, branchOrAdmin, async (req, res) => {
  try {
    let certs;
    if (req.user.role === 'admin') {
      certs = await Certificate.find().sort('-createdAt');
    } else {
      const students = await User.find({ role: 'student', branchId: req.user._id }).select('rollNumber enrollmentNumber formNo _id');
      const ids = students.map(s => s._id);
      const rolls = students.map(s => s.rollNumber).filter(Boolean);
      const enrolNos = students.map(s => s.enrollmentNumber).filter(Boolean);
      const formNos = students.map(s => s.formNo).filter(Boolean);
      certs = await Certificate.find({
        $or: [
          { student: { $in: ids } },
          { branchId: req.user._id },
          ...(rolls.length ? [{ rollNumber: { $in: rolls } }] : []),
          ...(enrolNos.length ? [{ enrollmentNumber: { $in: enrolNos } }] : []),
          ...(formNos.length ? [{ formNo: { $in: formNos } }] : []),
        ],
      }).sort('-createdAt');
    }
    res.json({ success: true, certificates: certs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
