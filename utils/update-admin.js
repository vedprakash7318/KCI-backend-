require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function updateAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const newEmail = 'kciayodhya41@gmail.com';
  const newPassword = 'admin@321';
  const hashed = await bcrypt.hash(newPassword, 10);

  const result = await db.collection('users').updateOne(
    { role: 'admin' },
    { $set: { email: newEmail, password: hashed } }
  );

  if (result.modifiedCount > 0) {
    console.log(`✅ Admin updated: ${newEmail} / admin@321`);
  } else {
    console.log('❌ No admin found. Run: npm run seed');
  }

  await mongoose.disconnect();
}

updateAdmin().catch(console.error);
