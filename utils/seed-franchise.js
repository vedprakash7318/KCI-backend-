const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');

const franchises = [
  { name: 'Head Office – Ayodhya', franchiseCenter: 'Head Office – Ayodhya (Faizabad)', franchiseCity: 'Ayodhya', phone: '9936384736', address: '1st Floor, Near Post Office, Sabji Mandi Road, Ayodhya, Faizabad', email: 'branch1@kci.org.in', franchiseCode: 'KCI-F-001' },
  { name: 'Parshurampur – Basti', franchiseCenter: 'Parshurampur – Basti', franchiseCity: 'Basti', phone: '9919660880', address: 'Near Central Bank, Parshurampur, Basti, U.P.', email: 'branch2@kci.org.in', franchiseCode: 'KCI-F-002' },
  { name: 'Shivdayalganj (Katara) – Gonda', franchiseCenter: 'Shivdayalganj (Katara) – Gonda', franchiseCity: 'Gonda', phone: '9919360223', address: 'Near Police Chauki, Shivdayalganj (Katara), Gonda, U.P.', email: 'branch3@kci.org.in', franchiseCode: 'KCI-F-003' },
  { name: 'Harraiya Bazar – Basti', franchiseCenter: 'Harraiya Bazar – Basti', franchiseCity: 'Basti', phone: '9354429858', address: 'In Front of Jagdish Sweets, Gupta Complex, Harraiya Bazar, Basti, U.P.', email: 'branch4@kci.org.in', franchiseCode: 'KCI-F-004' },
  { name: 'Nand Nagar, Chauri Bazar – Basti', franchiseCenter: 'Nand Nagar, Chauri Bazar – Basti', franchiseCity: 'Basti', phone: '9984096033', address: 'Near Indian Petrol Pump, Nand Nagar, Chauri Bazar, Basti, U.P.', email: 'branch5@kci.org.in', franchiseCode: 'KCI-F-005' },
  { name: 'Chhawani Bazar – Basti', franchiseCenter: 'Chhawani Bazar – Basti', franchiseCity: 'Basti', phone: '9554236619', address: 'Near Ram Janki Marg Tiraha, Chhawani Bazar, Basti, U.P.', email: 'branch6@kci.org.in', franchiseCode: 'KCI-F-006' },
  { name: 'Hanumangarhi Chauraha – Ayodhya', franchiseCenter: 'Hanumangarhi Chauraha – Ayodhya', franchiseCity: 'Ayodhya', phone: '9936384736', address: 'Infront of Singh Dwar, Near Hanumangarhi Chauraha, Up to New J.K. Medical Store, Ayodhya, Faizabad', email: 'branch7@kci.org.in', franchiseCode: 'KCI-F-007' },
  { name: 'Maqbara Chauraha – Faizabad', franchiseCenter: 'Maqbara Chauraha – Faizabad', franchiseCity: 'Faizabad', phone: '9919660880', address: 'Maqbara Chauraha, Faizabad', email: 'branch8@kci.org.in', franchiseCode: 'KCI-F-008' },
  { name: 'Sheetalganj – Siddharth Nagar', franchiseCenter: 'Sheetalganj – Siddharth Nagar', franchiseCity: 'Siddharth Nagar', phone: '9616426496', address: 'Bilauha Road, Sheetalganj, Near Hanuman Mandir, Bansi, Siddharth Nagar', email: 'branch9@kci.org.in', franchiseCode: 'KCI-F-009' },
  { name: 'Gonda', franchiseCenter: 'Gonda', franchiseCity: 'Gonda', phone: '9936384736', address: 'Gonda, U.P.', email: 'branch10@kci.org.in', franchiseCode: 'KCI-F-010' },
  { name: 'Vikramjot Bazar – Basti', franchiseCenter: 'Vikramjot Bazar – Basti', franchiseCity: 'Basti', phone: '8920527355', address: 'Infront of DDS Inter College, Vikramjot Bazar, Basti', email: 'branch11@kci.org.in', franchiseCode: 'KCI-F-011' },
  { name: 'Sabji Mandi Gali – Ayodhya', franchiseCenter: 'Sabji Mandi Gali – Ayodhya', franchiseCity: 'Ayodhya', phone: '', address: 'Near Aata Chakki, Sabji Mandi Gali, Ayodhya, Faizabad', email: 'branch12@kci.org.in', franchiseCode: 'KCI-F-012' },
  { name: 'Amauli Bazar – Basti', franchiseCenter: 'Amauli Bazar – Basti', franchiseCity: 'Basti', phone: '9696293481', address: 'Amauli Bazar, Basti', email: 'branch13@kci.org.in', franchiseCode: 'KCI-F-013' },
  { name: 'Bhadariya Bazar – Siddharth Nagar', franchiseCenter: 'Bhadariya Bazar – Siddharth Nagar', franchiseCity: 'Siddharth Nagar', phone: '', address: 'Bhadariya Bazar, Dumariya Ganj, Siddharth Nagar', email: 'branch14@kci.org.in', franchiseCode: 'KCI-F-014' },
  { name: 'Nawabganj – Gonda', franchiseCenter: 'Nawabganj – Gonda', franchiseCity: 'Gonda', phone: '9616426496', address: 'Near Gandhi Inter College, In Front of G.C. Academy, Padav Chauraha, Nawabganj, Gonda', email: 'branch15@kci.org.in', franchiseCode: 'KCI-F-015' },
  { name: 'Chandni Chowk – Gonda', franchiseCenter: 'Chandni Chowk – Gonda', franchiseCity: 'Gonda', phone: '9919878477', address: 'Chandni Chowk, Gonda', email: 'branch16@kci.org.in', franchiseCode: 'KCI-F-016' },
  { name: 'Sikanderpur – Basti', franchiseCenter: 'Sikanderpur – Basti', franchiseCity: 'Basti', phone: '9696554357', address: 'Near Chauri Mode, Sikanderpur, Basti', email: 'branch17@kci.org.in', franchiseCode: 'KCI-F-017' },
  { name: 'Vishweshwar Ganj – Bahraich', franchiseCenter: 'Vishweshwar Ganj – Bahraich', franchiseCity: 'Bahraich', phone: '9936384736', address: 'Vishweshwar Ganj, Bahraich', email: 'branch18@kci.org.in', franchiseCode: 'KCI-F-018' },
  { name: 'Laxmanpur Bazar – Srawasti', franchiseCenter: 'Laxmanpur Bazar – Srawasti', franchiseCity: 'Srawasti', phone: '', address: 'Laxmanpur Bazar, Bhinga, Srawasti', email: 'branch19@kci.org.in', franchiseCode: 'KCI-F-019' },
  { name: 'Kohrayen Bazar – Basti', franchiseCenter: 'Kohrayen Bazar – Basti', franchiseCity: 'Basti', phone: '9919660880', address: 'Near Rajwapur Mode, Kohrayen Bazar, Basti', email: 'branch20@kci.org.in', franchiseCode: 'KCI-F-020' },
  { name: 'Kolhampur – Gonda', franchiseCenter: 'Kolhampur – Gonda', franchiseCity: 'Gonda', phone: '9919360223', address: 'Kolhampur, Gonda', email: 'branch21@kci.org.in', franchiseCode: 'KCI-F-021' },
  { name: 'Durjanpur Pachumi – Gonti', franchiseCenter: 'Durjanpur Pachumi – Gonti', franchiseCity: 'Gonti', phone: '6387725823', address: 'Near Gramin Bank, Durjanpur Pachumi, Gonti', email: 'branch22@kci.org.in', franchiseCode: 'KCI-F-022' },
  { name: 'Sitkohar Gaur – Basti', franchiseCenter: 'Sitkohar Gaur – Basti', franchiseCity: 'Basti', phone: '7379718258', address: 'Gaur Halua Marg, Sitkohar, Gaur, Basti', email: 'branch23@kci.org.in', franchiseCode: 'KCI-F-023' },
  { name: 'TutiBheeti (Haseenabad) – Basti', franchiseCenter: 'TutiBheeti (Haseenabad) – Basti', franchiseCity: 'Basti', phone: '', address: 'Near State Bank of India, TutiBheeti (Haseenabad), Basti', email: 'branch24@kci.org.in', franchiseCode: 'KCI-F-024' },
  { name: 'Ambedkarnagar', franchiseCenter: 'Ambedkarnagar', franchiseCity: 'Ambedkarnagar', phone: '9919660880', address: 'Ambedkarnagar, U.P.', email: 'branch25@kci.org.in', franchiseCode: 'KCI-F-025' },
  { name: 'Ghosiyari Bazar – Siddharth Nagar', franchiseCenter: 'Ghosiyari Bazar – Siddharth Nagar', franchiseCity: 'Siddharth Nagar', phone: '9936384736', address: 'Ghosiyari Bazar, Siddharth Nagar', email: 'branch26@kci.org.in', franchiseCode: 'KCI-F-026' },
  { name: 'Durjanpur Ghat – Gonda', franchiseCenter: 'Durjanpur Ghat – Gonda', franchiseCity: 'Gonda', phone: '9616426496', address: 'Durjanpur Ghat, Gonda', email: 'branch27@kci.org.in', franchiseCode: 'KCI-F-027' },
  { name: 'GahmarKunj – Lucknow', franchiseCenter: 'GahmarKunj – Lucknow', franchiseCity: 'Lucknow', phone: '9936384736', address: 'Near Matiyari, GahmarKunj, Lucknow', email: 'branch28@kci.org.in', franchiseCode: 'KCI-F-028' },
  { name: 'Belwa Sengar – Santkabir Nagar', franchiseCenter: 'Belwa Sengar – Santkabir Nagar', franchiseCity: 'Santkabir Nagar', phone: '8601568705', address: 'Belwa Sengar Chauraha, Santkabir Nagar', email: 'branch29@kci.org.in', franchiseCode: 'KCI-F-029' },
  { name: 'Khandasa – Ayodhya', franchiseCenter: 'Khandasa – Ayodhya', franchiseCity: 'Ayodhya', phone: '7408465327', address: 'Near Police Chauki, Khandasa, Ayodhya', email: 'branch30@kci.org.in', franchiseCode: 'KCI-F-030' },
  { name: 'Nand Nagar', franchiseCenter: 'Nand Nagar', franchiseCity: 'Basti', phone: '8923234638', address: 'Nand Nagar, Basti, U.P.', email: 'fullstackgenius1@gmail.com', franchiseCode: 'KCI-F-294351' },
];

async function seedFranchise() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let added = 0, skipped = 0;
    for (const f of franchises) {
      const exists = await User.findOne({ email: f.email });
      if (exists) { skipped++; continue; }
      await User.create({
        name: f.name,
        email: f.email,
        password: 'kci123456',
        phone: f.phone,
        address: f.address,
        franchiseCenter: f.franchiseCenter,
        franchiseCity: f.franchiseCity,
        franchiseCode: f.franchiseCode,
        role: 'franchise',
        isApproved: true,
        isActive: true,
      });
      added++;
    }

    console.log(`✅ Done! Added: ${added}, Skipped (already exist): ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seedFranchise();
