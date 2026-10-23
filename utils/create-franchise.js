const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

async function createFranchise() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const franchise = await User.findOne({ email: 'franchise@kci.org.in' });
    if (franchise) {
      console.log('Franchise already exists');
      process.exit(0);
    }

    await User.create({
      name: 'Franchise Manager',
      email: 'franchise@kci.org.in',
      password: 'franchise123',
      phone: '9876543210',
      franchiseCenter: 'Test Center - Ayodhya',
      franchiseCity: 'Ayodhya',
      franchiseCode: 'KCI-F-TEST001',
      role: 'franchise',
      isApproved: true,
      isActive: true,
    });

    console.log('✅ Franchise created!');
    console.log('Email: franchise@kci.org.in');
    console.log('Password: franchise123');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createFranchise();

