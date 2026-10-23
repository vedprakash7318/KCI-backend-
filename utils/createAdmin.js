require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@kci.org.in';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin@321';
const adminName = 'Super Admin (KCI)';

async function insertOrUpdateAdmin() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Primary Super Admin (from .env or default)
    let admin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (admin) {
      admin.name = adminName;
      admin.password = adminPassword; // Pre-save hook will hash it
      admin.role = 'admin';
      admin.isSuperAdmin = true;
      admin.isActive = true;
      admin.isApproved = true;
      admin.lockUntil = null;
      admin.loginAttempts = 0;
      await admin.save();
      console.log(`✅ Admin updated successfully: ${adminEmail}`);
    } else {
      admin = await User.create({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        role: 'admin',
        isSuperAdmin: true,
        isActive: true,
        isApproved: true,
      });
      console.log(`✅ Admin created successfully: ${adminEmail}`);
    }

    // 2. Also ensure kciayodhya41@gmail.com exists as well for convenience
    const secondaryEmail = 'kciayodhya41@gmail.com';
    let secondaryAdmin = await User.findOne({ email: secondaryEmail.toLowerCase() });
    if (secondaryAdmin) {
      secondaryAdmin.password = adminPassword;
      secondaryAdmin.role = 'admin';
      secondaryAdmin.isSuperAdmin = true;
      secondaryAdmin.isActive = true;
      secondaryAdmin.isApproved = true;
      secondaryAdmin.lockUntil = null;
      secondaryAdmin.loginAttempts = 0;
      await secondaryAdmin.save();
      console.log(`✅ Secondary admin updated successfully: ${secondaryEmail}`);
    } else {
      await User.create({
        name: 'Admin KCI Ayodhya',
        email: secondaryEmail.toLowerCase(),
        password: adminPassword,
        role: 'admin',
        isSuperAdmin: true,
        isActive: true,
        isApproved: true,
      });
      console.log(`✅ Secondary admin created successfully: ${secondaryEmail}`);
    }

    console.log('\n==========================================');
    console.log('🔑 ADMIN LOGIN CREDENTIALS:');
    console.log(`1. Email: ${adminEmail} | Password: ${adminPassword}`);
    console.log(`2. Email: ${secondaryEmail} | Password: ${adminPassword}`);
    console.log('Role: admin (Super Admin: true)');
    console.log('==========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  }
}

insertOrUpdateAdmin();
