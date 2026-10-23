const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    designation: { type: String, required: true },
    qualification: { type: String },
    experience: { type: String },
    photo: { type: String },
    email: { type: String },
    phone: { type: String },
    department: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema);
