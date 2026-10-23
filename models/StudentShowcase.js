const mongoose = require('mongoose');

const StudentShowcaseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  image: { type: String, required: true },
  course: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  status: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

StudentShowcaseSchema.index({ status: 1, displayOrder: 1 });

module.exports = mongoose.model('StudentShowcase', StudentShowcaseSchema);
