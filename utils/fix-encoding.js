require('dotenv').config();
const mongoose = require('mongoose');
const StudyMaterial = require('../models/StudyMaterial');

const fixStr = str => {
  if (!str) return str;
  return str
    .replace(/â€"/g, '–')
    .replace(/â€"/g, '—')
    .replace(/â€˜/g, '\u2018')
    .replace(/â€™/g, '\u2019')
    .replace(/â€œ/g, '\u201C')
    .replace(/â€/g, '\u201D')
    .replace(/Â /g, ' ')
    .replace(/Â·/g, '·');
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const all = await StudyMaterial.find({});
  let count = 0;
  for (const m of all) {
    const fixedTitle = fixStr(m.title);
    const fixedDesc = fixStr(m.description);
    if (fixedTitle !== m.title || fixedDesc !== m.description) {
      await StudyMaterial.findByIdAndUpdate(m._id, { title: fixedTitle, description: fixedDesc });
      console.log(`Fixed: "${m.title}" → "${fixedTitle}"`);
      count++;
    }
  }
  console.log(`Done. Fixed ${count} records.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
