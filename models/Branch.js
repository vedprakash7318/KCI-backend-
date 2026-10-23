const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    mapLink: { type: String },
    isMain: { type: Boolean, default: false },
    image: { type: String },
    staffDetails: [{ name: { type: String }, role: { type: String }, phone: { type: String } }],
    branchNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branch', branchSchema);
