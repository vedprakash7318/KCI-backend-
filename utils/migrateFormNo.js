const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');

async function migrateFormNo() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB...');

  // Get all students without formNo, ordered by creation date
  const students = await User.find({ role: 'student', formNo: { $in: [null, '', undefined] } })
    .sort({ createdAt: 1 });

  console.log(`Found ${students.length} students without formNo`);

  if (students.length === 0) {
    console.log('All students already have formNo. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // Get current max serial from existing formNo to avoid duplicates
  const existing = await User.find({ role: 'student', formNo: { $exists: true, $ne: null, $ne: '' } })
    .select('formNo');

  let maxSerial = 0;
  existing.forEach(s => {
    const match = s.formNo?.match(/KCI\/FORM\/\d+\/(\d+)/);
    if (match) {
      const serial = parseInt(match[1]);
      if (serial > maxSerial) maxSerial = serial;
    }
  });

  console.log(`Starting serial from: ${maxSerial + 1}`);

  const year = new Date().getFullYear();
  let updated = 0;

  for (const student of students) {
    maxSerial++;
    const serial = String(maxSerial).padStart(4, '0');
    const formNo = `KCI/FORM/${year}/${serial}`;
    await User.findByIdAndUpdate(student._id, { formNo });
    console.log(`  ✓ ${student.name} → ${formNo}`);
    updated++;
  }

  console.log(`\n✅ Done! Updated ${updated} students with formNo.`);
  await mongoose.disconnect();
}

migrateFormNo().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
