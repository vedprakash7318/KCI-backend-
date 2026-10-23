const Course = require('../models/Course');

exports.getCourses = async (req, res) => {
  try {
    const { category, search, featured } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (featured) query.featured = true;
    if (search) query.title = { $regex: search, $options: 'i' };
    const courses = await Course.find(query).sort({ createdAt: -1 });
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const course = isObjectId
      ? await Course.findOne({ $or: [{ _id: id }, { slug: id }] })
      : await Course.findOne({ slug: id });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    if (typeof data.syllabus === 'string') data.syllabus = data.syllabus.split('\n').filter(Boolean);
    const course = await Course.create(data);
    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    if (typeof data.syllabus === 'string') data.syllabus = data.syllabus.split('\n').filter(Boolean);
    const course = await Course.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
