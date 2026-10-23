const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Course = require('../models/Course');
const Result = require('../models/Result');
const Certificate = require('../models/Certificate');
const Staff = require('../models/Staff');
const Branch = require('../models/Branch');
const Gallery = require('../models/Gallery');

const courses = [
  {
    title: 'Certificate In Fundamental (CIF)',
    slug: 'cif',
    description: 'Foundation course covering computer basics, MS Office, Internet, and hardware concepts.',
    duration: '3 Months',
    fee: 1700,
    category: 'Certificate',
    featured: true,
    eligibility: 'Open to all',
    syllabus: ['Computer Competency', 'MS DOS', 'Windows XP/07/10', 'MS Word 2007/2010', 'MS Excel 2007/2010', 'MS PowerPoint 2007/2010', 'Information Technology', 'I/O System', 'Storage Technology', 'Basic of Multimedia', 'Printing Technology', 'Kundli', 'Hardware Concept', 'Internet'],
  },
  {
    title: 'Certificate in Computer Application (CCA)',
    slug: 'cca',
    description: 'Comprehensive certificate course covering MS Office suite, MS Access, Internet and hardware.',
    duration: '6 Months',
    fee: 3700,
    category: 'Certificate',
    featured: true,
    eligibility: 'Open to all',
    syllabus: ['Computer Competency', 'MS DOS', 'Windows XP/07/10', 'MS Word 2007/2010', 'MS Excel 2007/2010', 'MS PowerPoint 2007/2010', 'MS Access 2007/2010', 'Information Technology', 'I/O System', 'Storage Technology', 'Basic of Multimedia', 'Printing Technology', 'Kundli', 'Hardware Concept', 'Internet'],
  },
  {
    title: 'Certificate In Office Package & Tally A/C (COPT)',
    slug: 'copt',
    description: 'Office automation with Tally Prime GST, Web Technology and Networking concepts.',
    duration: '8 Months',
    fee: 5200,
    category: 'Certificate',
    featured: true,
    eligibility: 'Open to all',
    syllabus: ['Computer Competency', 'MS DOS', 'Windows XP/07/10', 'MS Word 2007/2010', 'MS Excel 2007/2010', 'MS PowerPoint 2007/2010', 'Tally Prime With GST', 'Internet', 'Web Technology', 'Basic of Multimedia', 'Networking Concept', 'Hardware Concept', 'Storage Technology', 'I/O System', 'Printing Technology'],
  },
  {
    title: 'Tally Specialist Course With GST',
    slug: 'tally-specialist',
    description: 'In-depth Tally Prime with GST filing, accounting, payroll and inventory management.',
    duration: '4 Months',
    fee: 9100,
    category: 'Certificate',
    featured: true,
    eligibility: 'Open to all',
    syllabus: ['Tally Prime With GST', 'GST Filing', 'Accounting Basics', 'Payroll Management', 'Inventory Management', 'Banking & Finance'],
  },
  {
    title: 'Advance Diploma in Computer Application (ADCA)',
    slug: 'adca',
    description: 'Advanced diploma with programming, web design, Tally, Photoshop, CorelDraw and more.',
    duration: '12 Months',
    fee: 7700,
    category: 'Diploma',
    featured: true,
    eligibility: 'Open to all',
    syllabus: ['Computer Competency', 'MS DOS', 'Windows XP/07/10', 'MS Office Suite', 'MS Access', 'Tally Prime With GST', 'PageMaker', 'Corel Draw', 'Photoshop', 'Internet & Web Technology', 'Networking Concept', 'Hardware Concept', 'C Language', 'Python Programming', 'HTML', 'JavaScript', 'VB Script', 'Project'],
  },
  {
    title: 'Desktop Publishing (DTP)',
    slug: 'dtp',
    description: 'Learn PageMaker, CorelDraw, Photoshop for professional print and digital media design.',
    duration: '4 Months',
    fee: 3700,
    category: 'Certificate',
    featured: false,
    eligibility: 'Open to all',
    syllabus: ['Computer Competency', 'Windows XP/07/10', 'MS DOS', 'Page Maker', 'Corel Draw', 'Photoshop', 'Internet', 'Kundli', 'Basic of Multimedia', 'Networking Concept', 'Hardware Concept', 'Storage Technology', 'I/O System'],
  },
  {
    title: 'Computer Teacher Training Course',
    slug: 'cttc',
    description: 'CCC from NIELIT & Tally Learning from Tally Champs — Free. Become a certified computer teacher.',
    duration: '12 Months',
    fee: 9550,
    category: 'Professional',
    featured: false,
    eligibility: 'Graduate preferred',
    syllabus: ['Semester 1 — Computer Fundamentals', 'Semester 2 — Advanced Topics', 'CCC from NIELIT (Free)', 'Tally from Tally Champs (Free)', 'Teaching Methodology'],
  },
  {
    title: 'I.G.D. Bombay',
    slug: 'igd-bombay',
    description: 'Industrial Graphic Design course affiliated with Bombay board.',
    duration: '12 Months',
    fee: 5500,
    category: 'Diploma',
    featured: false,
    eligibility: 'Open to all',
    syllabus: ['Graphic Design Fundamentals', 'Industrial Design', 'Print Media', 'Digital Design'],
  },
  {
    title: 'Certificate In Computer Hardware (CICH)',
    slug: 'cich',
    description: 'Hands-on hardware course covering assembling, repairing, OS installation and troubleshooting.',
    duration: '3 Months',
    fee: 2700,
    category: 'Certificate',
    featured: false,
    eligibility: 'Open to all',
    syllabus: ['Fundamental of Computer Hardware', 'Basic Electronic & Maintenance', 'Number System (Binary, Octal & Hexa)', 'Architecture & Operating System', 'MS DOS', 'Windows XP/07/10', 'Computer Peripheral & Device', 'Computer Assembling', 'Hard Disk Partition', 'Software Installation', 'Plug & Play Configuration', 'Keyboard Repairing', 'Mouse Repairing', 'Printer Installation', 'Troubleshooting', 'I/O System', 'Internet'],
  },
  {
    title: 'JAVA, VB.net, ASP.net, PHP',
    slug: 'java-vb-asp-php',
    description: 'Individual programming language courses. Contact 9838873502 for details.',
    duration: 'Individual',
    fee: 0,
    category: 'Advanced',
    featured: false,
    eligibility: 'Basic computer knowledge',
    syllabus: ['Java Programming', 'VB.net', 'ASP.net', 'PHP', 'Web Development'],
  },
  {
    title: 'Computer Typing (Hindi + English)',
    slug: 'computer-typing',
    description: 'Speed typing course in both Hindi and English for government and private jobs.',
    duration: '6 Months',
    fee: 2500,
    category: 'Certificate',
    featured: false,
    eligibility: 'Open to all',
    syllabus: ['Hindi Typing', 'English Typing', 'Speed Building', 'Accuracy Practice', 'Typing Tests'],
  },
  {
    title: 'C, C++ Programming',
    slug: 'c-cpp',
    description: 'Learn C and C++ programming from basics to advanced with practical projects.',
    duration: '3 Months',
    fee: 3200,
    category: 'Advanced',
    featured: false,
    eligibility: 'Open to all',
    syllabus: ['C Language Basics', 'Control Structures', 'Functions & Arrays', 'Pointers', 'C++ OOP Concepts', 'Classes & Objects', 'Inheritance', 'Projects'],
  },
  {
    title: 'Internet Course',
    slug: 'internet',
    description: 'Quick 25-day course on internet usage, email, browsing and online services.',
    duration: '25 Days',
    fee: 800,
    category: 'Basic',
    featured: false,
    eligibility: 'Open to all',
    syllabus: ['Internet Basics', 'Web Browsing', 'Email', 'Online Services', 'Social Media', 'Online Safety'],
  },
  {
    title: 'Diploma in Computer Application (DCA)',
    slug: 'dca',
    description: 'Complete diploma with MS Office, Tally, Web Design, Python, HTML and project work.',
    duration: '12 Months',
    fee: 6200,
    category: 'Diploma',
    featured: true,
    eligibility: 'Open to all',
    syllabus: ['Computer Competency', 'MS DOS', 'Windows XP/07/10', 'MS Office Suite', 'MS Access', 'Tally Prime With GST', 'PageMaker', 'Corel Draw', 'Photoshop', 'Internet & Web Technology', 'Networking Concept', 'Hardware Concept', 'Storage Technology', 'I/O System', 'Printing Technology', 'Python Programming', 'HTML', 'Project'],
  },
  {
    title: 'Certificate In Tally A/c With GST (CIT)',
    slug: 'cit',
    description: 'Focused Tally with GST certificate course for accounting and finance professionals.',
    duration: '3 Months',
    fee: 3500,
    category: 'Certificate',
    featured: false,
    eligibility: 'Open to all',
    syllabus: ['Tally Prime With GST', 'GST Fundamentals', 'Accounting Entries', 'Payroll', 'Inventory', 'Reports & MIS'],
  },
  {
    title: 'Personality Development (Free on Every Course)',
    slug: 'personality-development',
    description: 'Free personality development classes included with every course enrollment.',
    duration: 'Included',
    fee: 0,
    category: 'Basic',
    featured: false,
    eligibility: 'All enrolled students',
    syllabus: ['Communication Skills', 'Confidence Building', 'Interview Preparation', 'Soft Skills', 'Leadership'],
  },
  {
    title: 'Diploma in Yoga Education (DYEd./DYT)',
    slug: 'dyed',
    description: 'Diploma in Yoga Education covering theory and practical yoga training.',
    duration: '12 Months (540 Hrs)',
    fee: 7000,
    category: 'Diploma',
    featured: false,
    eligibility: '10+2 Pass',
    syllabus: ['Yoga Philosophy', 'Asanas & Pranayama', 'Meditation', 'Anatomy', 'Teaching Methodology', 'Practical Training'],
  },
  {
    title: 'PG Diploma In Yoga Education (PGDYEd.)',
    slug: 'pgdyed',
    description: 'Post-graduate diploma in yoga education for graduates.',
    duration: '12 Months',
    fee: 12000,
    category: 'Diploma',
    featured: false,
    eligibility: 'Graduation',
    syllabus: ['Advanced Yoga Philosophy', 'Research Methodology', 'Advanced Asanas', 'Yoga Therapy', 'Project Work'],
  },
  {
    title: 'Multimedia Animation Course (N-Mass)',
    slug: 'n-mass',
    description: 'Professional multimedia and animation course for creative careers.',
    duration: 'Contact for details',
    fee: 0,
    category: 'Professional',
    featured: false,
    eligibility: 'Open to all',
    syllabus: ['2D Animation', '3D Animation', 'Video Editing', 'VFX Basics', 'Multimedia Production'],
  },
  {
    title: 'BCA / BBA / MCA / MBA / PGDCA & More (University Programs)',
    slug: 'university-programs',
    description: 'Degree programs by Dr. C.V. Raman University (UGC & DEC Approved), AISECT, NSDC. Contact 9838873502.',
    duration: '1–3 Years',
    fee: 0,
    category: 'Professional',
    featured: false,
    eligibility: 'As per program',
    syllabus: ['BCA (3 Year)', 'BBA (3 Year)', 'MCA (2 Year)', 'MBA (2 Year)', 'PGDCA (1 Year)', 'M.Sc. IT (1 Year)', 'DCA (1 Year)', 'PGDYN (12 Months)', 'BA (3 Years)', 'MA (2 Years)', 'MSW (2 Years)', 'DCEd. (3 Years)'],
  },
  {
    title: 'Course On Computer Concept (CCC from NIELIT)',
    slug: 'ccc-nielit',
    description: 'Government recognized CCC course from NIELIT covering all basic computer and internet concepts.',
    duration: '3 Months (80 Hours)',
    fee: 2860,
    category: 'Certificate',
    featured: true,
    eligibility: 'Open to all',
    syllabus: ['Introduction to Computer & Basic Concepts', 'Operating System', 'Elements of Word Processing', 'Spread Sheet', 'Introduction to Internet & Web Browser', 'Communication & Collaboration', 'Applications of Presentation', 'Applications of Digital Financial Service'],
  },
];

const staff = [
  { name: 'Mahendra Kumar Pandey', designation: 'Managing Director', department: 'Management', phone: '9936384736, 9919660880', order: 1 },
  { name: 'Mudita Shukla', designation: 'Faculty', department: 'Software Department', order: 2 },
  { name: 'Vidita Shukla', designation: 'Faculty', department: 'Software Department', order: 3 },
  { name: 'Ramesh Kumar', designation: 'Faculty', department: 'Software Department', order: 4 },
  { name: 'Rohit Kumar', designation: 'Faculty', department: 'Software Department', phone: '7275915114', order: 5 },
  { name: 'Mahendra Kumar Pandey', designation: 'Head of Department', department: 'Mobile Eng. & Software & Hardware Department', phone: '9919660880', order: 6 },
  { name: 'Rajesh Kumar Pandey', designation: 'Faculty', department: 'Software Department', phone: '9919360223', order: 7 },
  { name: 'Raj Kumar', designation: 'Faculty', department: 'Software Department', order: 8 },
  { name: 'Chandra Kiran', designation: 'Faculty', department: 'Software Department', order: 9 },
  { name: 'Mahendra Kumar Pandey', designation: 'Head of Department', department: 'Hardware Department & English Spoken', phone: '9415590726', order: 10 },
  { name: 'Banke Bihari Verma', designation: 'Faculty', department: 'Software Department', phone: '8604025557', order: 11 },
  { name: 'Vaishnavi Singh', designation: 'Faculty', department: 'Software Department', order: 12 },
  { name: 'Vishal Kumar', designation: 'Faculty', department: 'Software Department', order: 13 },
];

const branches = [
  { branchNumber: 1, name: 'Head Office – Ayodhya (Faizabad)', address: '1st Floor, Near Post Office, Sabji Mandi Road, Ayodhya, Faizabad', city: 'Ayodhya', isMain: true, staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', role: 'Managing Director', phone: '9936384736 & 9919660880' }, { name: 'Shivam Paswan, Shalu Kumari, Madhu', role: 'Staff' }] },
  { branchNumber: 2, name: 'Parshurampur – Basti', address: 'Near Central Bank, Parshurampur, Basti, U.P.', city: 'Basti', staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', phone: '9919660880, 9936384736' }, { name: 'Gudiya Gupta', role: 'Staff' }] },
  { branchNumber: 3, name: 'Shivdayalganj (Katara) – Gonda', address: 'Near Police Chauki, Shivdayalganj (Katara), Gonda, U.P.', city: 'Gonda', staffDetails: [{ name: 'Mr. Rajesh Pandey', phone: '9919360223' }, { name: 'Siddhi Tiwari' }, { name: 'Priyanka Pandey' }] },
  { branchNumber: 4, name: 'Harraiya Bazar – Basti', address: 'In Front of Jagdish Sweets, Gupta Complex, Harraiya Bazar, Basti, U.P.', city: 'Basti', staffDetails: [{ name: 'Mr. Ravi Kumar', phone: '9354429858' }] },
  { branchNumber: 5, name: 'Nand Nagar, Chauri Bazar – Basti', address: 'Near Indian Petrol Pump, Nand Nagar, Chauri Bazar, Basti, U.P.', city: 'Basti', staffDetails: [{ name: 'Mr. Pradeep Mishra', phone: '9984096033, 6394969760' }] },
  { branchNumber: 6, name: 'Chhawani Bazar – Basti', address: 'Near Ram Janki Marg Tiraha, Chhawani Bazar, Basti, U.P.', city: 'Basti', staffDetails: [{ name: 'Mr. Ramesh Kumar', phone: '9554236619' }] },
  { branchNumber: 7, name: 'Hanumangarhi Chauraha – Ayodhya', address: 'Infront of Singh Dwar, Near Hanumangarhi Chauraha, Up to New J.K. Medical Store, Ayodhya, Faizabad', city: 'Ayodhya', staffDetails: [{ name: 'Mahendra Kumar Pandey', phone: '9936384736 & 9919660880' }] },
  { branchNumber: 8, name: 'Maqbara Chauraha – Faizabad', address: 'Maqbara Chauraha, Faizabad', city: 'Faizabad', staffDetails: [{ name: 'Mahendra Kumar Pandey', phone: '9936384736 & 9919660880' }] },
  { branchNumber: 9, name: 'Sheetalganj – Siddharth Nagar', address: 'Bilauha Road, Sheetalganj, Near Hanuman Mandir, Bansi, Siddharth Nagar', city: 'Siddharth Nagar', staffDetails: [{ name: 'Mr. Krishna Dev', phone: '9616426496, 8299454653' }] },
  { branchNumber: 10, name: 'Gonda', address: 'Gonda, U.P.', city: 'Gonda', staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', phone: '9936384736' }] },
  { branchNumber: 11, name: 'Vikramjot Bazar – Basti', address: 'Infront of DDS Inter College, Vikramjot Bazar, Basti', city: 'Basti', staffDetails: [{ name: 'Mr. Rakesh Gupta', phone: '8920527355' }, { name: 'Mr. Shubham Kumar', phone: '6393634249' }] },
  { branchNumber: 12, name: 'Sabji Mandi Gali – Ayodhya', address: 'Near Aata Chakki, Sabji Mandi Gali, Ayodhya, Faizabad', city: 'Ayodhya', staffDetails: [{ name: 'Mudita Shukla' }] },
  { branchNumber: 13, name: 'Amauli Bazar – Basti', address: 'Amauli Bazar, Basti', city: 'Basti', staffDetails: [{ name: 'Mr. Mansharam Verma', phone: '9696293481' }, { name: 'Munita Verma' }] },
  { branchNumber: 14, name: 'Bhadariya Bazar – Siddharth Nagar', address: 'Bhadariya Bazar, Dumariya Ganj, Siddharth Nagar', city: 'Siddharth Nagar', staffDetails: [{ name: 'Afazal Ali Khan' }] },
  { branchNumber: 15, name: 'Nawabganj – Gonda', address: 'Near Gandhi Inter College, In Front of G.C. Academy, Padav Chauraha, Nawabganj, Gonda', city: 'Gonda', staffDetails: [{ name: 'Mr. Krishna Dev Maurya', phone: '9616426496, 8299454653' }] },
  { branchNumber: 16, name: 'Chandni Chowk – Gonda', address: 'Chandni Chowk, Gonda', city: 'Gonda', staffDetails: [{ name: 'Mohd. Mustakeem Idrisi', phone: '9919878477 & 9918374821' }] },
  { branchNumber: 17, name: 'Sikanderpur – Basti', address: 'Near Chauri Mode, Sikanderpur, Basti', city: 'Basti', staffDetails: [{ name: 'Mr. Puskar Srivastava', phone: '9696554357' }] },
  { branchNumber: 18, name: 'Vishweshwar Ganj – Bahraich', address: 'Vishweshwar Ganj, Bahraich', city: 'Bahraich', staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', phone: '9936384736' }] },
  { branchNumber: 19, name: 'Laxmanpur Bazar – Srawasti', address: 'Laxmanpur Bazar, Bhinga, Srawasti', city: 'Srawasti', staffDetails: [{ name: 'Mr. Satish Kumar' }] },
  { branchNumber: 20, name: 'Kohrayen Bazar – Basti', address: 'Near Rajwapur Mode, Kohrayen Bazar, Basti', city: 'Basti', staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', phone: '9919660880, 9936384736' }, { name: 'Smita Pandey' }] },
  { branchNumber: 21, name: 'Kolhampur – Gonda', address: 'Kolhampur, Gonda', city: 'Gonda', staffDetails: [{ name: 'Mr. Rajesh Pandey & Siddhi Tiwari', phone: '9919360223' }] },
  { branchNumber: 22, name: 'Durjanpur Pachumi – Gonti', address: 'Near Gramin Bank, Durjanpur Pachumi, Gonti', city: 'Gonti', staffDetails: [{ name: 'Mr. Saurabh Gupta', phone: '6387725823' }] },
  { branchNumber: 23, name: 'Sitkohar Gaur – Basti', address: 'Gaur Halua Marg, Sitkohar, Gaur, Basti', city: 'Basti', staffDetails: [{ name: 'Mr. Rajneesh Pathak', phone: '7379718258' }] },
  { branchNumber: 24, name: 'TutiBheeti (Haseenabad) – Basti', address: 'Near State Bank of India, TutiBheeti (Haseenabad), Basti', city: 'Basti', staffDetails: [{ name: 'Vishnu Sharma' }] },
  { branchNumber: 25, name: 'Ambedkarnagar', address: 'Ambedkarnagar, U.P.', city: 'Ambedkarnagar', staffDetails: [{ name: 'Mr. Mahendra Pandey', phone: '9919660880' }] },
  { branchNumber: 26, name: 'Ghosiyari Bazar – Siddharth Nagar', address: 'Ghosiyari Bazar, Siddharth Nagar', city: 'Siddharth Nagar', staffDetails: [{ name: 'Mr. Mahendra Pandey', phone: '9936384736' }] },
  { branchNumber: 27, name: 'Durjanpur Ghat – Gonda', address: 'Durjanpur Ghat, Gonda', city: 'Gonda', staffDetails: [{ name: 'Mr. Krishna Dev Maurya', phone: '9616426496' }] },
  { branchNumber: 28, name: 'GahmarKunj – Lucknow', address: 'Near Matiyari, GahmarKunj, Lucknow', city: 'Lucknow', staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', phone: '9936384736' }] },
  { branchNumber: 29, name: 'Belwa Sengar – Santkabir Nagar', address: 'Belwa Sengar Chauraha, Santkabir Nagar', city: 'Santkabir Nagar', staffDetails: [{ name: 'Mr. Anil Kumar Agrahari', phone: '8601568705, 9454864987' }] },
  { branchNumber: 30, name: 'Khandasa – Ayodhya', address: 'Near Police Chauki, Khandasa, Ayodhya', city: 'Ayodhya', staffDetails: [{ name: 'Mr. Lalit Ram Yadav', phone: '7408465327' }] },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Staff.deleteMany({}),
      Branch.deleteMany({}),
      Gallery.deleteMany({}),
      Result.deleteMany({}),
      Certificate.deleteMany({}),
    ]);

    const createdCourses = await Course.insertMany(courses);
    await Staff.insertMany(staff);
    await Branch.insertMany(branches);

    const admin = await User.create({
      name: 'Admin KCI',
      email: 'kciayodhya41@gmail.com',
      password: 'admin@321',
      role: 'admin',
    });

    const student = await User.create({
      name: 'Rahul Verma',
      email: 'student@kci.org.in',
      password: 'student123',
      role: 'student',
      rollNumber: 'KCI20240001',
      phone: '9876543210',
      course: createdCourses[1]._id,
      batch: '2024',
    });

    await Result.create({
      student: student._id,
      rollNumber: 'KCI20240001',
      studentName: 'Rahul Verma',
      course: createdCourses[1]._id,
      courseName: 'DCA - Diploma in Computer Applications',
      batch: '2024',
      subjects: [
        { name: 'Computer Fundamentals', maxMarks: 100, obtainedMarks: 85 },
        { name: 'MS Office', maxMarks: 100, obtainedMarks: 90 },
        { name: 'Internet', maxMarks: 50, obtainedMarks: 45 },
        { name: 'Tally', maxMarks: 100, obtainedMarks: 78 },
        { name: 'C Programming', maxMarks: 100, obtainedMarks: 72 },
      ],
      totalMarks: 450,
      obtainedMarks: 370,
      percentage: 82.22,
      grade: 'A',
      status: 'Pass',
      examDate: new Date('2024-06-15'),
    });

    await Certificate.create({
      student: student._id,
      rollNumber: 'KCI20240001',
      studentName: 'Rahul Verma',
      course: createdCourses[1]._id,
      courseName: 'DCA - Diploma in Computer Applications',
      certificateNumber: 'KCI/2024/DCA/0001',
      issueDate: new Date('2024-07-01'),
      grade: 'A',
      isValid: true,
    });

    console.log('✅ Seed data inserted successfully!');
    console.log('Admin: admin@kci.org.in / admin123');
    console.log('Student: student@kci.org.in / student123');
    console.log('Student Roll: KCI20240001');
    console.log('Certificate No: KCI/2024/DCA/0001');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
