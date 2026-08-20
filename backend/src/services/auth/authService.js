const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');
const { UnauthorizedError } = require('../../errors/AuthError');
const { BadRequestError } = require('../../errors/AppError');
const emailService = require('../notifications/emailService');

const RESET_TOKEN_EXPIRES_MINUTES = 30;
const GENERIC_RESET_MESSAGE =
  'If an account exists for this email, a password reset link has been sent.';

function sanitizeAdmin(admin) {
  return {
    id: admin.id,
    full_name: admin.full_name,
    email: admin.email,
    role: admin.role,
  };
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function login(email, password) {
  const admin = await db('admin_users')
    .where({ email: email.toLowerCase().trim(), is_active: true })
    .first();

  if (!admin) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  await db('admin_users')
    .where({ id: admin.id })
    .update({ last_login_at: new Date() });

  const token = jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.full_name,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn },
  );

  return {
    token,
    expires_in: jwtExpiresIn,
    admin: sanitizeAdmin(admin),
  };
}

async function getAdminById(id) {
  const admin = await db('admin_users')
    .where({ id, is_active: true })
    .first();

  if (!admin) {
    throw new UnauthorizedError('Admin account not found');
  }

  return sanitizeAdmin(admin);
}

async function changePassword(adminId, currentPassword, newPassword) {
  const admin = await db('admin_users')
    .where({ id: adminId, is_active: true })
    .first();

  if (!admin) {
    throw new UnauthorizedError('Admin account not found');
  }

  const valid = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!valid) {
    throw new BadRequestError('Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw new BadRequestError('New password must be different from current password');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db('admin_users').where({ id: adminId }).update({
    password_hash: passwordHash,
    password_reset_token_hash: null,
    password_reset_expires_at: null,
  });

  return { message: 'Password changed successfully' };
}

async function forgotPassword(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const admin = await db('admin_users')
    .where({ email: normalizedEmail, is_active: true })
    .first();

  if (!admin) {
    return {
      message: GENERIC_RESET_MESSAGE,
    };
  }

  const resetToken = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);

  await db('admin_users').where({ id: admin.id }).update({
    password_reset_token_hash: hashResetToken(resetToken),
    password_reset_expires_at: expiresAt,
  });

  let emailResult = { sent: false };
  try {
    emailResult = await emailService.sendPasswordResetEmail(
      admin.email,
      resetToken,
      RESET_TOKEN_EXPIRES_MINUTES,
    );
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
  }

  const response = {
    message: GENERIC_RESET_MESSAGE,
    expires_in_minutes: RESET_TOKEN_EXPIRES_MINUTES,
    email_sent: emailResult.sent,
  };

  if (emailService.shouldReturnTokenInResponse(emailResult.sent)) {
    response.reset_token = resetToken;
    response.reset_link = emailService.buildResetLink(resetToken);
    response.dev_note = 'Reset token included because email is not configured or EMAIL_DEV_RETURN_TOKEN=true.';
  }

  return response;
}

async function resetPassword(token, newPassword) {
  const tokenHash = hashResetToken(token);

  const admin = await db('admin_users')
    .where({ password_reset_token_hash: tokenHash, is_active: true })
    .first();

  if (!admin) {
    throw new BadRequestError('Invalid or expired reset token');
  }

  if (!admin.password_reset_expires_at || new Date(admin.password_reset_expires_at) < new Date()) {
    throw new BadRequestError('Reset token has expired');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db('admin_users').where({ id: admin.id }).update({
    password_hash: passwordHash,
    password_reset_token_hash: null,
    password_reset_expires_at: null,
  });

  return { message: 'Password reset successfully' };
}

async function riderLogin(phone) {
  const normalized = String(phone || '').trim();
  if (!normalized) {
    throw new BadRequestError('Phone number is required');
  }

  const rider = await db('delivery_riders')
    .where({ phone_number: normalized })
    .first();

  if (!rider) {
    throw new UnauthorizedError('Rider not found. Ask admin to add your number.');
  }

  if (String(rider.status || '').toLowerCase() === 'inactive') {
    throw new UnauthorizedError('Rider account is inactive');
  }

  const token = jwt.sign(
    {
      sub: rider.id,
      role: 'rider',
      name: rider.full_name,
      phone: rider.phone_number,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn },
  );

  return {
    token,
    expires_in: jwtExpiresIn,
    rider: {
      id: rider.id,
      name: rider.full_name,
      phone: rider.phone_number,
      status: rider.status,
      role: 'rider',
    },
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

module.exports = {
  login,
  riderLogin,
  getAdminById,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyToken,
  sanitizeAdmin,
};
