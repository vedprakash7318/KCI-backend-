const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');
const { uploadDocument } = require('../middleware/cloudinary');


// Helper: decode JWT token from Bearer header if available without throwing error
const getOptionalUser = async (req) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return await User.findById(decoded.id).select('-password');
      }
    }
  } catch (_) {}
  return null;
};

// GET /api/study-material - Role-based branch-scoped materials
router.get('/', async (req, res) => {
  try {
    const { category, course } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (course) filter.course = course;

    const user = await getOptionalUser(req);

    if (user) {
      if (user.role === 'student') {
        // Resolve student's branchId
        let branchId = user.branchId || user.franchiseId;
        if (!branchId && user.branchName) {
          const branchUser = await User.findOne({
            role: 'branch',
            branchName: { $regex: new RegExp(`^${user.branchName.trim()}$`, 'i') },
          });
          if (branchUser) {
            branchId = branchUser._id;
            // Update student record asynchronously
            User.findByIdAndUpdate(user._id, { branchId: branchUser._id }).exec();
          }
        }

        if (branchId) {
          // Student sees materials of their enrolled branch OR global institute materials
          filter.$or = [
            { branchId: branchId },
            { branchId: null },
            { branchId: { $exists: false } },
          ];
        } else {
          // If unassigned student, sees only global materials
          filter.$or = [
            { branchId: null },
            { branchId: { $exists: false } },
          ];
        }
      } else if (user.role === 'branch' || user.role === 'franchise') {
        // Branch sees their own uploaded materials + global materials
        filter.$or = [
          { branchId: user._id },
          { uploadedBy: user._id },
          { branchId: null },
          { branchId: { $exists: false } },
        ];
      }
      // If admin, no branch filter is added: admin sees all
    } else {
      // Unauthenticated / public: only global materials
      filter.$or = [
        { branchId: null },
        { branchId: { $exists: false } },
      ];
    }

    const materials = await StudyMaterial.find(filter)
      .populate('course', 'title')
      .populate('uploadedBy', 'name')
      .sort('-createdAt');

    res.json({ success: true, materials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Download URL helper for local storage
const makeDownloadUrl = (url) => url || '';

// POST /api/study-material - Create study material with branch scoping
router.post('/', protect, uploadDocument.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  try {
    const isBranch = req.user.role === 'branch' || req.user.role === 'franchise';
    const branchId = isBranch ? req.user._id : (req.body.branchId || null);

    const data = {
      ...req.body,
      uploadedBy: req.user._id,
      branchId,
      isActive: true,
    };

    // Remove any client-generated temporary string _id (like 'sm_12345') to prevent CastError
    if (data._id && !mongoose.Types.ObjectId.isValid(data._id)) {
      delete data._id;
    }

    if (req.files?.file?.[0]) {
      const f = req.files.file[0];
      data.fileName = f.originalname;
      data.fileUrl = f.path || `/uploads/${f.filename}`;
    }
    if (req.files?.thumbnail?.[0]) {
      const t = req.files.thumbnail[0];
      data.thumbnailUrl = t.path || `/uploads/${t.filename}`;
    }

    const material = await StudyMaterial.create(data);
    res.status(201).json({ success: true, material });
  } catch (err) {
    console.error('Error creating study material:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', protect, uploadDocument.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.uploadedBy;

    if (req.files?.file?.[0]) {
      const f = req.files.file[0];
      data.fileName = f.originalname;
      data.fileUrl = f.path || `/uploads/${f.filename}`;
    }
    if (req.files?.thumbnail?.[0]) {
      const t = req.files.thumbnail[0];
      data.thumbnailUrl = t.path || `/uploads/${t.filename}`;
    }

    const material = await StudyMaterial.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json({ success: true, material });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await StudyMaterial.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
