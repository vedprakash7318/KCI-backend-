require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const branches = [
  { email: 'branch1@kci.org.in', branchName: 'Head Office – Ayodhya', branchCity: 'Ayodhya', branchAddress: '1st Floor, Near Post Office, Sabji Mandi Road, Ayodhya, Faizabad', phone: '9936384736' },
  { email: 'branch2@kci.org.in', branchName: 'Parshurampur – Basti', branchCity: 'Basti', branchAddress: 'Near Central Bank, Parshurampur, Basti, U.P.' },
  { email: 'branch3@kci.org.in', branchName: 'Shivdayalganj (Katara) – Gonda', branchCity: 'Gonda', branchAddress: 'Near Police Chauki, Shivdayalganj (Katara), Gonda, U.P.' },
  { email: 'branch4@kci.org.in', branchName: 'Harraiya Bazar – Basti', branchCity: 'Basti', branchAddress: 'In Front of Jagdish Sweets, Gupta Complex, Harraiya Bazar, Basti, U.P.', phone: '9354429858' },
  { email: 'branch5@kci.org.in', branchName: 'Nand Nagar, Chauri Bazar – Basti', branchCity: 'Basti', branchAddress: 'Near Indian Petrol Pump, Nand Nagar, Chauri Bazar, Basti, U.P.', phone: '9984096033' },
  { email: 'branch6@kci.org.in', branchName: 'Chhawani Bazar – Basti', branchCity: 'Basti', branchAddress: 'Near Ram Janki Marg Tiraha, Chhawani Bazar, Basti, U.P.', phone: '9554236619' },
  { email: 'branch7@kci.org.in', branchName: 'Hanumangarhi Chauraha – Ayodhya', branchCity: 'Ayodhya', branchAddress: 'Infront of Singh Dwar, Near Hanumangarhi Chauraha, Ayodhya, Faizabad', phone: '9936384736' },
  { email: 'branch8@kci.org.in', branchName: 'Maqbara Chauraha – Faizabad', branchCity: 'Faizabad', branchAddress: 'Maqbara Chauraha, Faizabad', phone: '9936384736' },
  { email: 'branch9@kci.org.in', branchName: 'Sheetalganj – Siddharth Nagar', branchCity: 'Siddharth Nagar', branchAddress: 'Bilauha Road, Sheetalganj, Near Hanuman Mandir, Bansi, Siddharth Nagar', phone: '9616426496' },
  { email: 'branch10@kci.org.in', branchName: 'Gonda', branchCity: 'Gonda', branchAddress: 'Gonda, U.P.', phone: '9936384736' },
  { email: 'branch11@kci.org.in', branchName: 'Vikramjot Bazar – Basti', branchCity: 'Basti', branchAddress: 'Infront of DDS Inter College, Vikramjot Bazar, Basti' },
  { email: 'branch12@kci.org.in', branchName: 'Sabji Mandi Gali – Ayodhya', branchCity: 'Ayodhya', branchAddress: 'Near Aata Chakki, Sabji Mandi Gali, Ayodhya, Faizabad' },
  { email: 'branch13@kci.org.in', branchName: 'Amauli Bazar – Basti', branchCity: 'Basti', branchAddress: 'Amauli Bazar, Basti' },
  { email: 'branch14@kci.org.in', branchName: 'Bhadariya Bazar – Siddharth Nagar', branchCity: 'Siddharth Nagar', branchAddress: 'Bhadariya Bazar, Dumariya Ganj, Siddharth Nagar' },
  { email: 'branch15@kci.org.in', branchName: 'Nawabganj – Gonda', branchCity: 'Gonda', branchAddress: 'Near Gandhi Inter College, Padav Chauraha, Nawabganj, Gonda', phone: '9616426496' },
  { email: 'branch16@kci.org.in', branchName: 'Chandni Chowk – Gonda', branchCity: 'Gonda', branchAddress: 'Chandni Chowk, Gonda', phone: '9919878477' },
  { email: 'branch17@kci.org.in', branchName: 'Sikanderpur – Basti', branchCity: 'Basti', branchAddress: 'Near Chauri Mode, Sikanderpur, Basti', phone: '9696554357' },
  { email: 'branch18@kci.org.in', branchName: 'Vishweshwar Ganj – Bahraich', branchCity: 'Bahraich', branchAddress: 'Vishweshwar Ganj, Bahraich', phone: '9936384736' },
  { email: 'branch19@kci.org.in', branchName: 'Laxmanpur Bazar – Srawasti', branchCity: 'Srawasti', branchAddress: 'Laxmanpur Bazar, Bhinga, Srawasti' },
  { email: 'branch20@kci.org.in', branchName: 'Kohrayen Bazar – Basti', branchCity: 'Basti', branchAddress: 'Near Rajwapur Mode, Kohrayen Bazar, Basti' },
  { email: 'branch21@kci.org.in', branchName: 'Kolhampur – Gonda', branchCity: 'Gonda', branchAddress: 'Kolhampur, Gonda', phone: '9919360223' },
  { email: 'branch22@kci.org.in', branchName: 'Durjanpur Pachumi – Gonti', branchCity: 'Gonti', branchAddress: 'Near Gramin Bank, Durjanpur Pachumi, Gonti', phone: '6387725823' },
  { email: 'branch23@kci.org.in', branchName: 'Sitkohar Gaur – Basti', branchCity: 'Basti', branchAddress: 'Gaur Halua Marg, Sitkohar, Gaur, Basti', phone: '7379718258' },
  { email: 'branch24@kci.org.in', branchName: 'TutiBheeti (Haseenabad) – Basti', branchCity: 'Basti', branchAddress: 'Near State Bank of India, TutiBheeti (Haseenabad), Basti' },
  { email: 'branch25@kci.org.in', branchName: 'Ambedkarnagar', branchCity: 'Ambedkarnagar', branchAddress: 'Ambedkarnagar, U.P.', phone: '9919660880' },
  { email: 'branch26@kci.org.in', branchName: 'Ghosiyari Bazar – Siddharth Nagar', branchCity: 'Siddharth Nagar', branchAddress: 'Ghosiyari Bazar, Siddharth Nagar', phone: '9936384736' },
  { email: 'branch27@kci.org.in', branchName: 'Durjanpur Ghat – Gonda', branchCity: 'Gonda', branchAddress: 'Durjanpur Ghat, Gonda', phone: '9616426496' },
  { email: 'branch28@kci.org.in', branchName: 'GahmarKunj – Lucknow', branchCity: 'Lucknow', branchAddress: 'Near Matiyari, GahmarKunj, Lucknow', phone: '9936384736' },
  { email: 'branch29@kci.org.in', branchName: 'Belwa Sengar – Santkabir Nagar', branchCity: 'Santkabir Nagar', branchAddress: 'Belwa Sengar Chauraha, Santkabir Nagar', phone: '8601568705' },
  { email: 'branch30@kci.org.in', branchName: 'Khandasa – Ayodhya', branchCity: 'Ayodhya', branchAddress: 'Near Police Chauki, Khandasa, Ayodhya', phone: '7408465327' },
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  let updated = 0;
  for (const b of branches) {
    const num = b.email.replace('branch', '').replace('@kci.org.in', '');
    const branchCode = 'KCI-B-' + num.padStart(3, '0');
    const upd = {
      role: 'branch',
      branchName: b.branchName,
      branchCity: b.branchCity,
      branchAddress: b.branchAddress,
      branchCode,
      isApproved: false,
    };
    if (b.phone) upd.phone = b.phone;
    const r = await User.updateOne({ email: b.email }, { $set: upd });
    if (r.modifiedCount) { updated++; console.log('✓', b.branchName); }
    else console.log('- skipped (not found or no change):', b.email);
  }
  const total = await User.countDocuments({ role: 'branch' });
  console.log('\nDone! Updated:', updated, '| Total branch users in DB:', total);
  mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
