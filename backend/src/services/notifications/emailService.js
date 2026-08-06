const nodemailer = require('nodemailer');
const { email, nodeEnv } = require('../../config/env');

let transporter;

function isEmailConfigured() {
  return email.enabled && email.host && email.user && email.pass;
}

function getTransporter() {
  if (!isEmailConfigured()) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: email.host,
      port: email.port,
      secure: email.secure,
      auth: {
        user: email.user,
        pass: email.pass,
      },
    });
  }

  return transporter;
}

function buildResetLink(token) {
  return `${email.adminFrontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(to, resetToken, expiresMinutes) {
  const transport = getTransporter();
  if (!transport) {
    return { sent: false, reason: 'email_not_configured' };
  }

  const resetLink = buildResetLink(resetToken);

  await transport.sendMail({
    from: email.from,
    to,
    subject: 'Reset your admin password',
    text: [
      'You requested a password reset for your restaurant admin account.',
      '',
      `Reset link (expires in ${expiresMinutes} minutes):`,
      resetLink,
      '',
      'If you did not request this, ignore this email.',
    ].join('\n'),
    html: `
      <p>You requested a password reset for your restaurant admin account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in <strong>${expiresMinutes} minutes</strong>.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });

  return { sent: true, resetLink };
}

function shouldReturnTokenInResponse(emailSent) {
  if (emailSent) return false;
  if (nodeEnv === 'production') return false;
  return email.devReturnToken || !isEmailConfigured();
}

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
  shouldReturnTokenInResponse,
  buildResetLink,
};
