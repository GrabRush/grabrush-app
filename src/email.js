const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
}

function buildVerificationLink(token, email) {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://grabrush.shop'
    : `http://localhost:${process.env.PORT || 9000}`;
  return `${baseUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;
}

module.exports = { createTransporter, buildVerificationLink };