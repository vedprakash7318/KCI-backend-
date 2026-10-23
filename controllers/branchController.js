const Branch = require('../models/Branch');

exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find().sort({ isMain: -1 });
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    const branch = await Branch.create(data);
    res.status(201).json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    await Branch.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Branch deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
