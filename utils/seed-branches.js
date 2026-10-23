const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });
const Branch = require('../models/Branch');

// Parse 30 branches exactly from data
const branchesData = [
  {
    branchNumber: 1,
    name: 'Head office : Keerti Computer Institute (1st Floor, Near Post Office, Sabji Mandi Road,   Ayodhya , Faizabad)',
    address: '1st Floor, Near Post Office, Sabji Mandi Road, Ayodhya, Faizabad',
    city: 'Ayodhya',
    phone: '9936384736 & 9919660880',
    staffDetails: [
      { name: 'Mr. Mahendra Kumar Pandey', role: 'Managing Director', phone: '9936384736 & 9919660880' },
      { name: 'Shivam Paswan' },
      { name: 'Shalu Kumari' },
      { name: 'Madhu' }
    ],
    isMain: true
  },
  {
    branchNumber: 2,
    name: 'Near Central Bank, Parshurampur, Basti, U.P.',
    address: 'Near Central Bank, Parshurampur, Basti, U.P.',
    city: 'Basti',
    phone: '9919660880, 9936384736',
    staffDetails: [
      { name: 'Mr. Mahendra Kumar Pandey', phone: '9919660880, 9936384736' },
      { name: 'Gudiya Gupta' }
    ]
  },
  {
    branchNumber: 3,
    name: 'Near Police Chauki, Shivdayalganj ( Katara ) Gonda, U.P.',
    address: 'Near Police Chauki, Shivdayalganj ( Katara ) Gonda, U.P.',
    city: 'Gonda',
    phone: '9919360223',
    staffDetails: [
      { name: 'Mr. Rajesh Pandey', phone: '9919360223' },
      { name: 'Siddhi Tiwari' },
      { name: 'Priyanka Pandey' }
    ]
  },
  // ... (continuing for all 30 exactly parsed)
  {
    branchNumber: 4,
    name: 'In Front of Jagdish Sweets , Gupta Complex, Harraiya Bazar , Basti-U.P.',
    address: 'In Front of Jagdish Sweets , Gupta Complex, Harraiya Bazar , Basti-U.P.',
    city: 'Basti',
    phone: '9354429858',
    staffDetails: [{ name: 'Mr. Ravi Kumar', phone: '9354429858' }]
  },
  {
    branchNumber: 5,
    name: 'Near Indian Petrol Pump Nand Nagar, Chauri Bazar, Basti U.P.',
    address: 'Near Indian Petrol Pump Nand Nagar, Chauri Bazar, Basti U.P.',
    city: 'Basti',
    phone: '9984096033, 6394969760',
    staffDetails: [{ name: 'Mr. Pradeep Mishra', phone: '9984096033, 6394969760' }]
  },
  {
    branchNumber: 6,
    name: 'Near Ram Janki Marg Tiraha, Chhawani Bazar, Basti-U.P.',
    address: 'Near Ram Janki Marg Tiraha, Chhawani Bazar, Basti-U.P.',
    city: 'Basti',
    phone: '9554236619',
    staffDetails: [{ name: 'Mr. Ramesh Kumar', phone: '9554236619' }]
  },
  {
    branchNumber: 7,
    name: 'Infront of Singh Dwar Near – Hanumangarhi Chauraha , Up to New J.K.Medical Store, Ayodhaya, Faizabad',
    address: 'Infront of Singh Dwar Near – Hanumangarhi Chauraha , Up to New J.K.Medical Store, Ayodhaya, Faizabad',
    city: 'Ayodhya',
    phone: '9936384736 & 9919660880',
    staffDetails: [{ name: 'Mahendra Kumar Pandey', phone: '9936384736 & 9919660880' }]
  },
  {
    branchNumber: 8,
    name: 'Maqbara Chauraha, Faizabad',
    address: 'Maqbara Chauraha, Faizabad',
    city: 'Faizabad',
    phone: '9936384736 & 9919660880',
    staffDetails: [{ name: 'Mahendra Kumar Pandey', phone: '9936384736 & 9919660880' }]
  },
  {
    branchNumber: 9,
    name: 'Bilauha Road, Sheetalganj, Near Hanuman Mandir Bansi – Siddharth Nagar',
    address: 'Bilauha Road, Sheetalganj, Near Hanuman Mandir Bansi – Siddharth Nagar',
    city: 'Siddharth Nagar',
    phone: '9616426496, 8299454653',
    staffDetails: [{ name: 'Mr. Krishna Dev', phone: '9616426496, 8299454653' }]
  },
  {
    branchNumber: 10,
    name: 'Gonda',
    address: 'Gonda',
    city: 'Gonda',
    phone: '9936384736',
    staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', phone: '9936384736' }]
  },
  {
    branchNumber: 11,
    name: 'Infront of DDS Inter College, Vikramjot Bazar, Basti',
    address: 'Infront of DDS Inter College, Vikramjot Bazar, Basti',
    city: 'Basti',
    phone: '8920527355, 6393634249',
    staffDetails: [
      { name: 'Mr. Rakesh Gupta', phone: '8920527355' },
      { name: 'Mr. Shubham Kumar', phone: '6393634249' }
    ]
  },
  {
    branchNumber: 12,
    name: 'Near Aata Chakki, Sabji Mandi Gali, Ayodhya, Faizabad',
    address: 'Near Aata Chakki, Sabji Mandi Gali, Ayodhya, Faizabad',
    city: 'Ayodhya',
    staffDetails: [{ name: 'Mudita Shukla' }]
  },
  {
    branchNumber: 13,
    name: 'Amauli Bazar, Basti',
    address: 'Amauli Bazar, Basti',
    city: 'Basti',
    phone: '9696293481',
    staffDetails: [
      { name: 'Mr. Mansharam Verma', phone: '9696293481' },
      { name: 'Munita Verma' }
    ]
  },
  {
    branchNumber: 14,
    name: 'Bhadariya Bazar, Dumariya ganj, Siddharth Nagar',
    address: 'Bhadariya Bazar, Dumariya ganj, Siddharth Nagar',
    city: 'Siddharth Nagar',
    staffDetails: [{ name: 'Afazal Ali Khan' }]
  },
  {
    branchNumber: 15,
    name: 'Nawabganj- Near Gandhi Inter College, In Front of G.C. Academy Padav chauraha Nawabganj, Gonda',
    address: 'Near Gandhi Inter College, In Front of G.C. Academy Padav chauraha Nawabganj, Gonda',
    city: 'Gonda',
    phone: '9616426496, 8299454653',
    staffDetails: [{ name: 'Mr. Krishna Dev Maurya', phone: '9616426496, 8299454653' }]
  },
  {
    branchNumber: 16,
    name: 'Chandni Chowk, Gonda',
    address: 'Chandni Chowk, Gonda',
    city: 'Gonda',
    phone: '9919878477 & 9918374821',
    staffDetails: [{ name: 'Mohd. Mustakeem Idrisi', phone: '9919878477 & 9918374821' }]
  },
  {
    branchNumber: 17,
    name: 'Near Chauri Mode Sikanderpur- Basti',
    address: 'Near Chauri Mode Sikanderpur- Basti',
    city: 'Basti',
    phone: '9696554357',
    staffDetails: [{ name: 'Mr. Puskar Srivastava', phone: '9696554357' }]
  },
  {
    branchNumber: 18,
    name: 'Vishweshwar ganj Bahraich',
    address: 'Vishweshwar ganj Bahraich',
    city: 'Bahraich',
    phone: '9936384736',
    staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', phone: '9936384736' }]
  },
  {
    branchNumber: 19,
    name: 'Laxmanpur Bazar, Bhinga ( Srawasti )',
    address: 'Laxmanpur Bazar, Bhinga ( Srawasti )',
    city: 'Srawasti',
    staffDetails: [{ name: 'Mr. Satish Kumar' }]
  },
  {
    branchNumber: 20,
    name: 'Near Rajwapur Mode, Kohrayen Bazar -Basti',
    address: 'Near Rajwapur Mode, Kohrayen Bazar -Basti',
    city: 'Basti',
    phone: '9919660880, 9936384736',
    staffDetails: [
      { name: 'Mr. Mahendra Kumar Pandey', phone: '9919660880, 9936384736' },
      { name: 'Smita Pandey' }
    ]
  },
  {
    branchNumber: 21,
    name: 'Kolhampur, Gonda',
    address: 'Kolhampur, Gonda',
    city: 'Gonda',
    phone: '9919360223',
    staffDetails: [
      { name: 'Mr. Rajesh Pandey', phone: '9919360223' },
      { name: 'Siddhi Tiwari' }
    ]
  },
  {
    branchNumber: 22,
    name: 'Near Gramin Bank Durjanpur Pachumi- Gonti',
    address: 'Near Gramin Bank Durjanpur Pachumi- Gonti',
    city: 'Gonti',
    phone: '6387725823',
    staffDetails: [{ name: 'Mr. Saurabh Gupta', phone: '6387725823' }]
  },
  {
    branchNumber: 23,
    name: 'Gaur Halua Marg, Sitkohar, Gaur, Basti',
    address: 'Gaur Halua Marg, Sitkohar, Gaur, Basti',
    city: 'Basti',
    phone: '7379718258',
    staffDetails: [{ name: 'Mr. Rajneesh Pathak', phone: '7379718258' }]
  },
  {
    branchNumber: 24,
    name: 'Near State Bank Of India, TutiBheeti(Haseenabad)-Basti',
    address: 'Near State Bank Of India, TutiBheeti(Haseenabad)-Basti',
    city: 'Basti',
    staffDetails: [{ name: 'Vishnu Sharma' }]
  },
  {
    branchNumber: 25,
    name: 'Ambedkarnagar',
    address: 'Ambedkarnagar',
    city: 'Ambedkarnagar',
    phone: '9919660880',
    staffDetails: [{ name: 'Mr. Mahendra Pandey', phone: '9919660880' }]
  },
  {
    branchNumber: 26,
    name: 'Ghosiyari Bazar -Siddharth Nagar',
    address: 'Ghosiyari Bazar -Siddharth Nagar',
    city: 'Siddharth Nagar',
    phone: '9936384736',
    staffDetails: [{ name: 'Mr. Mahendra Pandey', phone: '9936384736' }]
  },
  {
    branchNumber: 27,
    name: 'Durjanpur Ghat- Gonda',
    address: 'Durjanpur Ghat- Gonda',
    city: 'Gonda',
    phone: '9616426496',
    staffDetails: [{ name: 'Mr. Krishna Dev Maurya', phone: '9616426496' }]
  },
  {
    branchNumber: 28,
    name: 'Near Matiyari, GahmarKunj – Lucknow',
    address: 'Near Matiyari, GahmarKunj – Lucknow',
    city: 'Lucknow',
    phone: '9936384736',
    staffDetails: [{ name: 'Mr.Mahendra Kumar Pandey', phone: '9936384736' }]
  },
  {
    branchNumber: 29,
    name: 'Belwa Sengar Chauraha, Santkabir Nagar',
    address: 'Belwa Sengar Chauraha, Santkabir Nagar',
    city: 'Santkabir Nagar',
    phone: '8601568705, 9454864987',
    staffDetails: [{ name: 'Mr. Anil Kumar Agrahari', phone: '8601568705, 9454864987' }]
  },
  {
    branchNumber: 30,
    name: 'Near Police Chauki  Khandasa-Ayodhya',
    address: 'Near Police Chauki  Khandasa-Ayodhya',
    city: 'Ayodhya',
    phone: '7408465327',
    staffDetails: [{ name: 'Mr. Lalit Ram Yadav', phone: '7408465327 all' }]
  }
];

async function seedBranches() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const count = await Branch.countDocuments();
    if (count >= 25) { // Allow if sample exists
      console.log(`Already ${count} branches. To re-seed, run node utils/seed.js first to clear or manually delete.`);
      process.exit(0);
    }

    console.log('🌱 Seeding 30 branches...');
    await Branch.insertMany(branchesData);
    console.log('✅ 30 branches seeded!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seedBranches();

