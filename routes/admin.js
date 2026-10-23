const router = require('express').Router();
const { getDashboardStats, getAnalytics, getMonthlyStudentsDetail, createStudent, getStudents, updateStudent, deleteStudent, getBranchUsers, universalStudentSearch, getAuditLogs } = require('../controllers/adminController');
const generateStudentNumbers = require('../utils/generateStudentNumbers');
const { protect, admin, superAdmin } = require('../middleware/auth');
const { uploadStudent } = require('../middleware/cloudinary');


router.get('/stats', protect, admin, getDashboardStats);
router.get('/analytics', protect, admin, getAnalytics);
router.get('/monthly-students-detail', protect, admin, getMonthlyStudentsDetail);
router.get('/students', protect, admin, getStudents);
router.get('/students/search', protect, admin, universalStudentSearch);
router.get('/branch-users', protect, admin, getBranchUsers);
router.get('/audit-logs', protect, admin, getAuditLogs);
router.post('/students', protect, admin, uploadStudent.single('photo'), createStudent);
router.put('/students/:id', protect, admin, uploadStudent.single('photo'), updateStudent);
router.delete('/students/:id', protect, superAdmin, deleteStudent);

// One-time migration: assign formNo to students who don't have one
router.post('/migrate-form-no', protect, admin, async (req, res) => {
  try {
    const User = require('../models/User');
    const students = await User.find({ role: 'student', formNo: { $in: [null, '', undefined] } }).sort({ createdAt: 1 });
    if (students.length === 0) return res.json({ success: true, message: 'All students already have formNo', updated: 0 });

    const existing = await User.find({ role: 'student', formNo: { $exists: true, $ne: null } }).select('formNo');
    let maxSerial = 0;
    existing.forEach(s => {
      const match = s.formNo?.match(/KCI\/FORM\/\d+\/(\d+)/);
      if (match && parseInt(match[1]) > maxSerial) maxSerial = parseInt(match[1]);
    });

    const year = new Date().getFullYear();
    const results = [];
    for (const student of students) {
      maxSerial++;
      const formNo = `KCI/FORM/${year}/${String(maxSerial).padStart(4, '0')}`;
      await User.findByIdAndUpdate(student._id, { formNo });
      results.push({ name: student.name, formNo });
    }
    res.json({ success: true, updated: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
