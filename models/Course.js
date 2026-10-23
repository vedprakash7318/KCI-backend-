const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, required: true },
    duration: { type: String, required: true },
    fee: { type: Number, required: true },
    category: {
      type: String,
      enum: ['Basic', 'Advanced', 'Professional', 'Diploma', 'Certificate'],
      default: 'Certificate',
    },
    syllabus: [{ type: String }],
    eligibility: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

courseSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);
