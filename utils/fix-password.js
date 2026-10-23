/**
 * Run: node utils/fix-password.js
 * Fixes plaintext passwords for branch/franchise/admin users
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fixPasswords() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Use raw collection to get actual stored password values
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({
    role: { $in: ['branch', 'franchise', 'admin'] }
  }).toArray();

  let fixed = 0;
  for (const user of users) {
    if (!user.password.startsWith('$2')) {
      const hashed = await bcrypt.hash(user.password, 10);
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { password: hashed } }
      );
      console.log(`Fixed: ${user.email} (${user.role})`);
      fixed++;
    }
  }

  console.log(`\nDone. Fixed ${fixed} user(s).`);
  await mongoose.disconnect();
}

fixPasswords().catch(console.error);
