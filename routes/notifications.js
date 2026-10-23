const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, admin } = require('../middleware/auth');
const { uploadStudent } = require('../middleware/cloudinary');

const branchAuth = (req, res, next) => {
  if (req.user && ['branch', 'franchise', 'admin'].includes(req.user.role)) return next();
  res.status(403).json({ success: false, message: 'Branch access required' });
};

// Student: get own notifications (role-based + specific student targeting)
router.get('/my', protect, async (req, res) => {
  try {
    const branchId = req.user.branchId || req.user.franchiseId || null;
    const userId = req.user._id;
    const query = {
      isActive: true,
      $or: [{ branchId: null }, ...(branchId ? [{ branchId }] : [])],
      $and: [{
        $or: [
          { targetRole: 'all' },
          { targetRole: req.user.role },
          // specific: only if this student is in targetStudents array
          { targetRole: 'specific', targetStudents: userId },
        ]
      }],
    };
    const notifications = await Notification.find(query).sort('-createdAt').limit(50).populate('createdBy', 'name branchName role');
    const result = notifications.map(n => ({ ...n.toObject(), isRead: n.readBy.some(id => id.toString() === userId.toString()) }));
    res.json({ success: true, notifications: result, unreadCount: result.filter(n => !n.isRead).length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Student: mark one as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user._id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Student: mark all as read
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    const branchId = req.user.branchId || req.user.franchiseId || null;
    await Notification.updateMany(
      { isActive: true, readBy: { $ne: req.user._id }, $or: [{ branchId: null }, ...(branchId ? [{ branchId }] : [])] },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: get all notifications
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { isActive: true, branchId: null };
    if (role) filter.$or = [{ targetRole: 'all' }, { targetRole: role }];
    const notifications = await Notification.find(filter).sort('-createdAt').limit(50);
    res.json({ success: true, notifications });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: create notification (with optional image)
router.post('/', protect, admin, uploadStudent.single('image'), async (req, res) => {
  try {
    const { title, message, type, targetRole, targetStudents } = req.body;
    // targetStudents can be comma-separated IDs or JSON array
    let students = [];
    if (targetRole === 'specific' && targetStudents) {
      students = Array.isArray(targetStudents)
        ? targetStudents
        : String(targetStudents).split(',').map(s => s.trim()).filter(Boolean);
    }
    const notification = await Notification.create({
      title, message, type, targetRole,
      targetStudents: students,
      image: req.file ? req.file.path : undefined,
      branchId: null,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, notification });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: update notification
router.put('/:id', protect, admin, uploadStudent.single('image'), async (req, res) => {
  try {
    const { title, message, type, targetRole } = req.body;
    const updates = { title, message, type, targetRole };
    if (req.file) updates.image = req.file.path;
    const notification = await Notification.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ success: true, notification });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: delete notification
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Branch: create branch notification (with optional specific student targeting)
router.post('/branch', protect, branchAuth, async (req, res) => {
  try {
    const { targetRole, targetStudents, ...rest } = req.body;
    let students = [];
    if (targetRole === 'specific' && targetStudents) {
      students = Array.isArray(targetStudents)
        ? targetStudents
        : String(targetStudents).split(',').map(s => s.trim()).filter(Boolean);
    }
    const notification = await Notification.create({
      ...rest,
      targetRole: targetRole || 'student',
      targetStudents: students,
      branchId: req.user.role === 'admin' ? (req.body.branchId || null) : req.user._id,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, notification });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Branch: get own notifications
router.get('/branch/list', protect, branchAuth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { branchId: req.user._id };
    const notifications = await Notification.find(filter).sort('-createdAt').populate('createdBy', 'name branchName');
    res.json({ success: true, notifications });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Branch: delete own notification
router.delete('/branch/:id', protect, branchAuth, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role !== 'admin' && notif.branchId?.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });
    await notif.deleteOne();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
