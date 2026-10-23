/**
 * Run: node utils/fix-certificates.js
 * Fixes existing certificates where enrollmentNumber/formNo/rollNumber are missing
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const User = require('../models/User');

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const certs = await Certificate.find();
  let fixed = 0;

  for (const cert of certs) {
    const updates = {};

    // Cross-populate identifier fields
    if (!cert.enrollmentNumber && cert.formNo) updates.enrollmentNumber = cert.formNo;
    if (!cert.rollNumber && cert.formNo) updates.rollNumber = cert.formNo;
    if (!cert.formNo && cert.enrollmentNumber) updates.formNo = cert.enrollmentNumber;

    // Try to find matching student and link
    if (!cert.student) {
      const query = [];
      if (cert.enrollmentNumber || updates.enrollmentNumber)
        query.push({ enrollmentNumber: cert.enrollmentNumber || updates.enrollmentNumber });
      if (cert.formNo || updates.formNo)
        query.push({ formNo: cert.formNo || updates.formNo });
      if (cert.rollNumber || updates.rollNumber)
        query.push({ rollNumber: cert.rollNumber || updates.rollNumber });

      if (query.length) {
        const student = await User.findOne({ $or: query, role: 'student' });
        if (student) {
          updates.student = student._id;
          if (!updates.enrollmentNumber && student.enrollmentNumber) updates.enrollmentNumber = student.enrollmentNumber;
          if (!updates.formNo && student.formNo) updates.formNo = student.formNo;
          if (!updates.rollNumber && student.rollNumber) updates.rollNumber = student.rollNumber;
        }
      }
    }

    if (Object.keys(updates).length) {
      await Certificate.findByIdAndUpdate(cert._id, updates);
      console.log(`Fixed: ${cert.studentName} | ${cert.certificateNumber}`);
      fixed++;
    }
  }

  console.log(`\nDone. Fixed ${fixed}/${certs.length} certificates.`);
  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
