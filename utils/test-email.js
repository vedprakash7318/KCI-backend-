require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ set' : '❌ NOT SET');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

transporter.verify((err, success) => {
  if (err) {
    console.error('❌ SMTP Error:', err.message);
  } else {
    console.log('✅ SMTP Connected! Sending test email...');
    transporter.sendMail({
      from: `"KCI Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'KCI Email Test',
      text: 'Email is working!',
    }, (err, info) => {
      if (err) console.error('❌ Send failed:', err.message);
      else console.log('✅ Email sent! MessageId:', info.messageId);
    });
  }
});
