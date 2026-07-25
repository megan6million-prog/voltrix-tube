const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

async function sendEmail(to, subject, text) {
  if (!process.env.SMTP_USER) return // skip if not configured
  await transporter.sendMail({ from: `Voltrix <${process.env.SMTP_USER}>`, to, subject, text })
}

module.exports = { sendEmail }
