const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });
const Staff = require('../models/Staff');

// Parsed 18+ staff exactly from data, no changes
const staffData = [
  { order: 1, name: 'Mahendra Kumar Pandey', designation: 'Managing Director', department: 'Management', phone: '9936384736, 9919660880' },
  { order: 2, name: 'Mudita Shukla', designation: 'Faculty', department: 'Software Department', phone: 'Not available' },
  { order: 3, name: 'Vidita Shukla', designation: 'Faculty', department: 'Software Department', phone: 'Not available' },
  { order: 4, name: 'Ramesh Kumar', designation: 'Faculty', department: 'Software Department', phone: 'Not available' },
  { order: 5, name: 'Rohit Kumar', designation: 'Faculty', department: 'Software Department', phone: '7275915114' },
  { order: 6, name: 'Mahendra Kumar Pandey', designation: 'Head of Department', department: 'Mobile Eng. & Software & Hardware Department', phone: '9919660880' },
  { order: 7, name: 'Rajesh Kumar Pandey', designation: 'Faculty', department: 'Software Department', phone: '9919360223' },
  { order: 8, name: 'Raj Kumar', designation: 'Faculty', department: 'Software Department', phone: 'Not available' },
  { order: 9, name: 'Chandra Kiran', designation: 'Faculty', department: 'Software Department', phone: 'Not available' },
  { order: 10, name: 'Mahendra Kumar Pandey', designation: 'Head of Department', department: 'Hardware Department & English Spoken', phone: '9415590726' },
  { order: 11, name: 'Banke Bihari Verma', designation: 'Faculty', department: 'Software Department', phone: '8604025557' },
  { order: 12, name: 'Vaishnavi Singh', designation: 'Faculty', department: 'Software Department', phone: 'Not available' },
  { order: 13, name: 'Vishal Kumar', designation: 'Faculty', department: 'Software Department', phone: 'Not available' }
];

async function seedStaff() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const count = await Staff.countDocuments();
    if (count >= 10) { // Allow if sample exists
      console.log(`Already ${count} staff. To re-seed, run node utils/seed.js first to clear.`);
      process.exit(0);
    }

    console.log('🌱 Seeding staff...');
    await Staff.insertMany(staffData);
    console.log('✅ Staff seeded!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seedStaff();

