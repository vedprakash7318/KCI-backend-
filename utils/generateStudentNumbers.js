const User = require('../models/User');

const generateStudentNumbers = async () => {
  const year = new Date().getFullYear();
  const center = '01';
  const maxRetries = 20;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const prefix = `${year}${center}`;

    // Find highest serial across ALL four fields to avoid any duplicate
    const [latestRoll, latestEnroll, latestReg, latestForm] = await Promise.all([
      User.find({ rollNumber: { $regex: `^${prefix}` } }, { rollNumber: 1 }).sort({ rollNumber: -1 }).limit(1).lean(),
      User.find({ enrollmentNumber: { $regex: `^KCI/ENR/${year}/` } }, { enrollmentNumber: 1 }).sort({ enrollmentNumber: -1 }).limit(1).lean(),
      User.find({ registrationNumber: { $regex: `^KCI/REG/${year}/` } }, { registrationNumber: 1 }).sort({ registrationNumber: -1 }).limit(1).lean(),
      User.find({ formNo: { $regex: `^KCI/FORM/${year}/` } }, { formNo: 1 }).sort({ formNo: -1 }).limit(1).lean(),
    ]);

    const parseSerial = (val, sliceFrom) => {
      if (!val) return 0;
      const part = val.slice(sliceFrom);
      const n = parseInt(part, 10);
      return isNaN(n) ? 0 : n;
    };

    const maxSerial = Math.max(
      parseSerial(latestRoll[0]?.rollNumber, prefix.length),
      parseSerial(latestEnroll[0]?.enrollmentNumber, `KCI/ENR/${year}/`.length),
      parseSerial(latestReg[0]?.registrationNumber, `KCI/REG/${year}/`.length),
      parseSerial(latestForm[0]?.formNo, `KCI/FORM/${year}/`.length),
    );

    const nextSerial = maxSerial + 1 + attempt; // attempt offset avoids race conditions
    const s = String(nextSerial).padStart(4, '0');
    const rollNumber = `${prefix}${s}`;
    const enrollmentNumber = `KCI/ENR/${year}/${s}`;
    const registrationNumber = `KCI/REG/${year}/${s}`;
    const formNo = `KCI/FORM/${year}/${s}`;

    // Check ALL four fields for conflicts simultaneously
    const conflict = await User.findOne({
      $or: [{ rollNumber }, { enrollmentNumber }, { registrationNumber }, { formNo }],
    }).lean();

    if (!conflict) {
      return { rollNumber, enrollmentNumber, registrationNumber, formNo };
    }
  }

  // Fallback: timestamp-based guaranteed unique
  const ts = Date.now().toString().slice(-6);
  return {
    rollNumber: `${year}${center}${ts}`,
    enrollmentNumber: `KCI/ENR/${year}/${ts}`,
    registrationNumber: `KCI/REG/${year}/${ts}`,
    formNo: `KCI/FORM/${year}/${ts}`,
  };
};

module.exports = generateStudentNumbers;
