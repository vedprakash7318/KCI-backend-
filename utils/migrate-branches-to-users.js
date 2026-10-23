const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');

const branches = [
  { branchNumber: 1, name: 'Head Office – Ayodhya (Faizabad)', city: 'Ayodhya', address: '1st Floor, Near Post Office, Sabji Mandi Road, Ayodhya, Faizabad', managerName: 'Mahendra Kumar Pandey', phone: '9936384736', email: 'branch1.headoffice@kci.org.in' },
  { branchNumber: 2, name: 'Parshurampur – Basti', city: 'Basti', address: 'Near Central Bank, Parshurampur, Basti, U.P.', managerName: 'Mahendra Kumar Pandey', phone: '9919660880', email: 'branch2.parshurampur@kci.org.in' },
  { branchNumber: 3, name: 'Shivdayalganj (Katara) – Gonda', city: 'Gonda', address: 'Near Police Chauki, Shivdayalganj (Katara), Gonda, U.P.', managerName: 'Rajesh Pandey', phone: '9919360223', email: 'branch3.shivdayalganj@kci.org.in' },
  { branchNumber: 4, name: 'Harraiya Bazar – Basti', city: 'Basti', address: 'In Front of Jagdish Sweets, Gupta Complex, Harraiya Bazar, Basti, U.P.', managerName: 'Ravi Kumar', phone: '9354429858', email: 'branch4.harraiya@kci.org.in' },
  { branchNumber: 5, name: 'Nand Nagar, Chauri Bazar – Basti', city: 'Basti', address: 'Near Indian Petrol Pump, Nand Nagar, Chauri Bazar, Basti, U.P.', managerName: 'Pradeep Mishra', phone: '9984096033', email: 'branch5.nandnagar@kci.org.in' },
  { branchNumber: 6, name: 'Chhawani Bazar – Basti', city: 'Basti', address: 'Near Ram Janki Marg Tiraha, Chhawani Bazar, Basti, U.P.', managerName: 'Ramesh Kumar', phone: '9554236619', email: 'branch6.chhawani@kci.org.in' },
  { branchNumber: 7, name: 'Hanumangarhi Chauraha – Ayodhya', city: 'Ayodhya', address: 'Infront of Singh Dwar, Near Hanumangarhi Chauraha, Ayodhya, Faizabad', managerName: 'Mahendra Kumar Pandey', phone: '9936384736', email: 'branch7.hanumangarhi@kci.org.in' },
  { branchNumber: 8, name: 'Maqbara Chauraha – Faizabad', city: 'Faizabad', address: 'Maqbara Chauraha, Faizabad', managerName: 'Mahendra Kumar Pandey', phone: '9936384736', email: 'branch8.maqbara@kci.org.in' },
  { branchNumber: 9, name: 'Sheetalganj – Siddharth Nagar', city: 'Siddharth Nagar', address: 'Bilauha Road, Sheetalganj, Near Hanuman Mandir, Bansi, Siddharth Nagar', managerName: 'Krishna Dev', phone: '9616426496', email: 'branch9.sheetalganj@kci.org.in' },
  { branchNumber: 10, name: 'Gonda', city: 'Gonda', address: 'Gonda, U.P.', managerName: 'Mahendra Kumar Pandey', phone: '9936384736', email: 'branch10.gonda@kci.org.in' },
  { branchNumber: 11, name: 'Vikramjot Bazar – Basti', city: 'Basti', address: 'Infront of DDS Inter College, Vikramjot Bazar, Basti', managerName: 'Rakesh Gupta', phone: '8920527355', email: 'branch11.vikramjot@kci.org.in' },
  { branchNumber: 12, name: 'Sabji Mandi Gali – Ayodhya', city: 'Ayodhya', address: 'Near Aata Chakki, Sabji Mandi Gali, Ayodhya, Faizabad', managerName: 'Mudita Shukla', phone: '9936384736', email: 'branch12.sabji@kci.org.in' },
  { branchNumber: 13, name: 'Amauli Bazar – Basti', city: 'Basti', address: 'Amauli Bazar, Basti', managerName: 'Mansharam Verma', phone: '9696293481', email: 'branch13.amauli@kci.org.in' },
  { branchNumber: 14, name: 'Bhadariya Bazar – Siddharth Nagar', city: 'Siddharth Nagar', address: 'Bhadariya Bazar, Dumariya Ganj, Siddharth Nagar', managerName: 'Afazal Ali Khan', phone: '9936384736', email: 'branch14.bhadariya@kci.org.in' },
  { branchNumber: 15, name: 'Nawabganj – Gonda', city: 'Gonda', address: 'Near Gandhi Inter College, In Front of G.C. Academy, Padav Chauraha, Nawabganj, Gonda', managerName: 'Krishna Dev Maurya', phone: '9616426496', email: 'branch15.nawabganj@kci.org.in' },
  { branchNumber: 16, name: 'Chandni Chowk – Gonda', city: 'Gonda', address: 'Chandni Chowk, Gonda', managerName: 'Mohd. Mustakeem Idrisi', phone: '9919878477', email: 'branch16.chandni@kci.org.in' },
  { branchNumber: 17, name: 'Sikanderpur – Basti', city: 'Basti', address: 'Near Chauri Mode, Sikanderpur, Basti', managerName: 'Puskar Srivastava', phone: '9696554357', email: 'branch17.sikanderpur@kci.org.in' },
  { branchNumber: 18, name: 'Vishweshwar Ganj – Bahraich', city: 'Bahraich', address: 'Vishweshwar Ganj, Bahraich', managerName: 'Mahendra Kumar Pandey', phone: '9936384736', email: 'branch18.vishweshwar@kci.org.in' },
  { branchNumber: 19, name: 'Laxmanpur Bazar – Srawasti', city: 'Srawasti', address: 'Laxmanpur Bazar, Bhinga, Srawasti', managerName: 'Satish Kumar', phone: '9936384736', email: 'branch19.laxmanpur@kci.org.in' },
  { branchNumber: 20, name: 'Kohrayen Bazar – Basti', city: 'Basti', address: 'Near Rajwapur Mode, Kohrayen Basti', managerName: 'Mahendra Kumar Pandey', phone: '9919660880', email: 'branch20.kohrayen@kci.org.in' },
  { branchNumber: 21, name: 'Kolhampur – Gonda', city: 'Gonda', address: 'Kolhampur, Gonda', managerName: 'Rajesh Pandey', phone: '9919360223', email: 'branch21.kolhampur@kci.org.in' },
  { branchNumber: 22, name: 'Durjanpur Pachumi – Gonti', city: 'Gonti', address: 'Near Gramin Bank, Durjanpur Pachumi, Gonti', managerName: 'Saurabh Gupta', phone: '6387725823', email: 'branch22.durjanpur@kci.org.in' },
  { branchNumber: 23, name: 'Sitkohar Gaur – Basti', city: 'Basti', address: 'Gaur Halua Marg, Sitkohar, Gaur, Basti', managerName: 'Rajneesh Pathak', phone: '7379718258', email: 'branch23.sitkohar@kci.org.in' },
  { branchNumber: 24, name: 'TutiBheeti (Haseenabad) – Basti', city: 'Basti', address: 'Near State Bank of India, TutiBheeti (Haseenabad), Basti', managerName: 'Vishnu Sharma', phone: '9936384736', email: 'branch24.tutibheeti@kci.org.in' },
  { branchNumber: 25, name: 'Ambedkarnagar', city: 'Ambedkarnagar', address: 'Ambedkarnagar, U.P.', managerName: 'Mahendra Pandey', phone: '9919660880', email: 'branch25.ambedkar@kci.org.in' },
  { branchNumber: 26, name: 'Ghosiyari Bazar – Siddharth Nagar', city: 'Siddharth Nagar', address: 'Ghosiyari Bazar, Siddharth Nagar', managerName: 'Mahendra Pandey', phone: '9936384736', email: 'branch26.ghosiyari@kci.org.in' },
  { branchNumber: 27, name: 'Durjanpur Ghat – Gonda', city: 'Gonda', address: 'Durjanpur Ghat, Gonda', managerName: 'Krishna Dev Maurya', phone: '9616426496', email: 'branch27.durjanpurghat@kci.org.in' },
  { branchNumber: 28, name: 'GahmarKunj – Lucknow', city: 'Lucknow', address: 'Near Matiyari, GahmarKunj, Lucknow', managerName: 'Mahendra Kumar Pandey', phone: '9936384736', email: 'branch28.gahmarkunj@kci.org.in' },
  { branchNumber: 29, name: 'Belwa Sengar – Santkabir Nagar', city: 'Santkabir Nagar', address: 'Belwa Sengar Chauraha, Santkabir Nagar', managerName: 'Anil Kumar Agrahari', phone: '8601568705', email: 'branch29.belwa@kci.org.in' },
  { branchNumber: 30, name: 'Khandasa – Ayodhya', city: 'Ayodhya', address: 'Near Police Chauki, Khandasa, Ayodhya', managerName: 'Lalit Ram Yadav', phone: '7408465327', email: 'branch30.khandasa@kci.org.in' },
];

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let added = 0, skipped = 0;

  for (const b of branches) {
    const exists = await User.findOne({ email: b.email });
    if (exists) { skipped++; continue; }

    const branchCode = `KCI-B-${String(b.branchNumber).padStart(3, '0')}`;
    await User.create({
      name: b.managerName,
      email: b.email,
      password: 'kci123456',
      phone: b.phone,
      branchName: b.name,
      branchCity: b.city,
      branchAddress: b.address,
      branchCode,
      role: 'branch',
      isApproved: false,
    });
    added++;
    console.log(`✅ Added: ${b.name}`);
  }

  console.log(`\nDone! Added: ${added}, Skipped (already exists): ${skipped}`);
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
