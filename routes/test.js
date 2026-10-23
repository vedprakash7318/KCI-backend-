const express = require('express');
const router = express.Router();

router.get('/run-seed', async (req, res) => {
  try {
    const User = require('../models/User');
    const Course = require('../models/Course');
    const Result = require('../models/Result');
    const Certificate = require('../models/Certificate');
    const Staff = require('../models/Staff');
    const Branch = require('../models/Branch');
    const Gallery = require('../models/Gallery');

    await Promise.all([
      User.deleteMany({}), Course.deleteMany({}), Staff.deleteMany({}),
      Branch.deleteMany({}), Gallery.deleteMany({}), Result.deleteMany({}), Certificate.deleteMany({})
    ]);

    const seed = require('../utils/seed-data');
    const createdCourses = await Course.insertMany(seed.courses);
    await Staff.insertMany(seed.staff);
    await Branch.insertMany(seed.branches);

    const student = await User.create({ name: 'Rahul Verma', email: 'student@kci.org.in', password: 'student123', role: 'student', rollNumber: 'KCI20240001', phone: '9876543210', course: createdCourses[1]._id, batch: '2024' });
    await User.create({ name: 'Admin KCI', email: 'admin@kci.org.in', password: 'admin123', role: 'admin' });

    await Result.create({ student: student._id, rollNumber: 'KCI20240001', studentName: 'Rahul Verma', course: createdCourses[1]._id, courseName: 'DCA', batch: '2024', subjects: [{ name: 'Computer Fundamentals', maxMarks: 100, obtainedMarks: 85 }, { name: 'MS Office', maxMarks: 100, obtainedMarks: 90 }], totalMarks: 200, obtainedMarks: 175, percentage: 87.5, grade: 'A', status: 'Pass', examDate: new Date('2024-06-15') });
    await Certificate.create({ student: student._id, rollNumber: 'KCI20240001', studentName: 'Rahul Verma', course: createdCourses[1]._id, courseName: 'DCA', certificateNumber: 'KCI/2024/DCA/0001', issueDate: new Date('2024-07-01'), grade: 'A', isValid: true });

    res.json({ success: true, message: 'Seed completed! admin@kci.org.in / admin123' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
