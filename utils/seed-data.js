const courses = [
  { title: 'Certificate In Fundamental (CIF)', slug: 'cif', description: 'Foundation course covering computer basics, MS Office, Internet, and hardware concepts.', duration: '3 Months', fee: 1700, category: 'Certificate', featured: true, eligibility: 'Open to all', syllabus: ['Computer Competency', 'MS DOS', 'Windows XP/07/10', 'MS Word', 'MS Excel', 'MS PowerPoint', 'Internet'] },
  { title: 'Certificate in Computer Application (CCA)', slug: 'cca', description: 'Comprehensive certificate course covering MS Office suite, MS Access, Internet and hardware.', duration: '6 Months', fee: 3700, category: 'Certificate', featured: true, eligibility: 'Open to all', syllabus: ['Computer Competency', 'MS Office Suite', 'MS Access', 'Internet', 'Hardware Concept'] },
  { title: 'Certificate In Office Package & Tally A/C (COPT)', slug: 'copt', description: 'Office automation with Tally Prime GST, Web Technology and Networking concepts.', duration: '8 Months', fee: 5200, category: 'Certificate', featured: true, eligibility: 'Open to all', syllabus: ['MS Office', 'Tally Prime With GST', 'Internet', 'Networking Concept'] },
  { title: 'Tally Specialist Course With GST', slug: 'tally-specialist', description: 'In-depth Tally Prime with GST filing, accounting, payroll and inventory management.', duration: '4 Months', fee: 9100, category: 'Certificate', featured: true, eligibility: 'Open to all', syllabus: ['Tally Prime With GST', 'GST Filing', 'Payroll Management', 'Inventory Management'] },
  { title: 'Advance Diploma in Computer Application (ADCA)', slug: 'adca', description: 'Advanced diploma with programming, web design, Tally, Photoshop, CorelDraw and more.', duration: '12 Months', fee: 7700, category: 'Diploma', featured: true, eligibility: 'Open to all', syllabus: ['MS Office Suite', 'Tally Prime With GST', 'Corel Draw', 'Photoshop', 'Python Programming', 'HTML', 'JavaScript'] },
  { title: 'Diploma in Computer Application (DCA)', slug: 'dca', description: 'Complete diploma with MS Office, Tally, Web Design, Python, HTML and project work.', duration: '12 Months', fee: 6200, category: 'Diploma', featured: true, eligibility: 'Open to all', syllabus: ['MS Office Suite', 'Tally Prime With GST', 'Python Programming', 'HTML', 'Project'] },
  { title: 'Course On Computer Concept (CCC from NIELIT)', slug: 'ccc-nielit', description: 'Government recognized CCC course from NIELIT.', duration: '3 Months', fee: 2860, category: 'Certificate', featured: true, eligibility: 'Open to all', syllabus: ['Computer Basics', 'MS Office', 'Internet', 'Digital Financial Service'] },
  { title: 'Desktop Publishing (DTP)', slug: 'dtp', description: 'Learn PageMaker, CorelDraw, Photoshop for professional design.', duration: '4 Months', fee: 3700, category: 'Certificate', featured: false, eligibility: 'Open to all', syllabus: ['Page Maker', 'Corel Draw', 'Photoshop'] },
];

const staff = [
  { name: 'Mahendra Kumar Pandey', designation: 'Managing Director', department: 'Management', phone: '9936384736', order: 1 },
  { name: 'Mudita Shukla', designation: 'Faculty', department: 'Software Department', order: 2 },
  { name: 'Vidita Shukla', designation: 'Faculty', department: 'Software Department', order: 3 },
  { name: 'Rohit Kumar', designation: 'Faculty', department: 'Software Department', phone: '7275915114', order: 4 },
  { name: 'Rajesh Kumar Pandey', designation: 'Faculty', department: 'Software Department', phone: '9919360223', order: 5 },
];

const branches = [
  { branchNumber: 1, name: 'Head Office – Ayodhya (Faizabad)', address: '1st Floor, Near Post Office, Sabji Mandi Road, Ayodhya, Faizabad', city: 'Ayodhya', isMain: true, staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', role: 'Managing Director', phone: '9936384736' }] },
  { branchNumber: 2, name: 'Parshurampur – Basti', address: 'Near Central Bank, Parshurampur, Basti, U.P.', city: 'Basti', staffDetails: [{ name: 'Mr. Mahendra Kumar Pandey', phone: '9919660880' }] },
  { branchNumber: 3, name: 'Shivdayalganj – Gonda', address: 'Near Police Chauki, Shivdayalganj, Gonda, U.P.', city: 'Gonda', staffDetails: [{ name: 'Mr. Rajesh Pandey', phone: '9919360223' }] },
  { branchNumber: 4, name: 'Harraiya Bazar – Basti', address: 'In Front of Jagdish Sweets, Gupta Complex, Harraiya Bazar, Basti', city: 'Basti', staffDetails: [{ name: 'Mr. Ravi Kumar', phone: '9354429858' }] },
];

module.exports = { courses, staff, branches };
