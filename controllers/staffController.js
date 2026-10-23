const Staff = require('../models/Staff');
const { deleteFromCloudinary } = require('../middleware/cloudinary');

exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.find().sort({ order: 1 });
    res.json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.photo = req.file.path;
    const staff = await Staff.create(data);
    res.status(201).json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      const old = await Staff.findById(req.params.id);
      if (old?.photo) await deleteFromCloudinary(old.photo);
      data.photo = req.file.path;
    }
    const staff = await Staff.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (staff?.photo) await deleteFromCloudinary(staff.photo);
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Staff deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
