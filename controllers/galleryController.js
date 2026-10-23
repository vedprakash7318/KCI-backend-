const Gallery = require('../models/Gallery');

exports.getGallery = async (req, res) => {
  try {
    const query = req.query.category ? { category: req.query.category } : {};
    const items = await Gallery.find(query).sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addGalleryItem = async (req, res) => {
  try {
    const files = req.files?.length ? req.files : req.file ? [req.file] : [];
    if (!files.length) return res.status(400).json({ success: false, message: 'Image required' });
    // Save local path — served via /uploads/
    const items = await Gallery.insertMany(
      files.map(f => ({ ...req.body, image: `/uploads/${f.filename}` }))
    );
    res.status(201).json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteGalleryItem = async (req, res) => {
  try {
    await Gallery.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
