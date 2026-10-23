const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');

async function assignNumbers() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const year = new Date().getFullYear();
  const center = '01';
  const students = await User.find({ role: 'student' }).sort({ createdAt: 1 });

  let updated = 0;
  for (let i = 0; i < students.length; i++) {
    const serial = String(i + 1).padStart(4, '0');
    const rollNumber = `${year}${center}${serial}`;
    const enrollmentNumber = `KCI/ENR/${year}/${serial}`;
    const registrationNumber = `KCI/REG/${year}/${serial}`;

    await User.findByIdAndUpdate(students[i]._id, {
      rollNumber,
      enrollmentNumber,
      registrationNumber,
    });

    console.log(`✅ ${students[i].name} → Roll: ${rollNumber} | Enrollment: ${enrollmentNumber} | Reg: ${registrationNumber}`);
    updated++;
  }

  console.log(`\nDone! ${updated} students updated.`);
  process.exit(0);
}

assignNumbers().catch(err => { console.error(err); process.exit(1); });
