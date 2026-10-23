const router = require('express').Router();
const StudentShowcase = require('../models/StudentShowcase');
const { protect, admin } = require('../middleware/auth');
const { uploadStudent, deleteFromCloudinary } = require('../middleware/cloudinary');

const DEFAULT_SHOWCASE_STUDENTS = [
  { name: 'Rahul Kumar', course: 'Web Development', year: '2026', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80', status: true, displayOrder: 1 },
  { name: 'Priya Sharma', course: 'Graphic Design', year: '2025', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', status: true, displayOrder: 2 },
  { name: 'Aman Singh', course: 'Python', year: '2026', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', status: true, displayOrder: 3 },
  { name: 'Neha Gupta', course: 'Tally', year: '2025', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', status: true, displayOrder: 4 },
  { name: 'Rohit Verma', course: 'DCA', year: '2026', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', status: true, displayOrder: 5 },
  { name: 'Sneha Yadav', course: 'ADCA', year: '2025', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', status: true, displayOrder: 6 },
  { name: 'Ankit Raj', course: 'Java', year: '2026', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80', status: true, displayOrder: 7 },
  { name: 'Kavya Mishra', course: 'Digital Marketing', year: '2025', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80', status: true, displayOrder: 8 },
];

// Helper: Seed initial showcase data if collection is empty
const ensureSeed = async () => {
  const count = await StudentShowcase.countDocuments();
  if (count === 0) {
    await StudentShowcase.insertMany(DEFAULT_SHOWCASE_STUDENTS);
  }
};

// GET Public Active Showcase Students (No Auth Required)
router.get('/public', async (req, res) => {
  try {
    await ensureSeed();
    const students = await StudentShowcase.find({ status: true })
      .sort({ displayOrder: 1, createdAt: -1 });
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET All Showcase Students for Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    await ensureSeed();
    const students = await StudentShowcase.find().sort({ displayOrder: 1, createdAt: -1 });
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Add New Showcase Student (Admin)
router.post('/', protect, admin, uploadStudent.single('image'), async (req, res) => {
  try {
    const { name, course, year, status, displayOrder } = req.body;
    
    if (!name || !course || !year) {
      return res.status(400).json({ success: false, message: 'Name, course, and year are required.' });
    }

    let imageUrl = req.body.imageUrl || '';
    if (req.file) {
      imageUrl = req.file.path || req.file.secure_url;
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Student image file or URL is required.' });
    }

    const newStudent = await StudentShowcase.create({
      name: name.trim(),
      course: course.trim(),
      year: year.trim(),
      image: imageUrl,
      status: status !== undefined ? String(status) === 'true' : true,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0,
    });

    res.status(201).json({ success: true, student: newStudent, message: 'Showcase student added successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT Edit Showcase Student (Admin)
router.put('/:id', protect, admin, uploadStudent.single('image'), async (req, res) => {
  try {
    const student = await StudentShowcase.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Showcase student not found.' });
    }

    const { name, course, year, status, displayOrder } = req.body;

    if (name) student.name = name.trim();
    if (course) student.course = course.trim();
    if (year) student.year = year.trim();
    if (status !== undefined) student.status = String(status) === 'true';
    if (displayOrder !== undefined) student.displayOrder = parseInt(displayOrder, 10);

    if (req.file) {
      const newImageUrl = req.file.path || `/uploads/${req.file.filename}`;
      if (student.image) {
        await deleteFromCloudinary(student.image);
      }
      student.image = newImageUrl;
    } else if (req.body.imageUrl) {
      student.image = req.body.imageUrl;
    }

    await student.save();
    res.json({ success: true, student, message: 'Showcase student updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH Toggle Active / Inactive Status (Admin)
router.patch('/:id/status', protect, admin, async (req, res) => {
  try {
    const student = await StudentShowcase.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Showcase student not found.' });

    student.status = !student.status;
    await student.save();
    res.json({ success: true, student, message: `Status changed to ${student.status ? 'Active' : 'Inactive'}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE Showcase Student (Admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const student = await StudentShowcase.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Showcase student not found.' });

    if (student.image) {
      await deleteFromCloudinary(student.image);
    }

    await StudentShowcase.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Showcase student deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
