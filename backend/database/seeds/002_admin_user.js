const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const adminId = uuidv4();
const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@restaurant.com';
const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';
const passwordHash = bcrypt.hashSync(defaultPassword, 10);

/**
 * @param { import('knex').Knex } knex
 */
exports.seed = async function seed(knex) {
  await knex('admin_users').del();

  await knex('admin_users').insert({
    id: adminId,
    full_name: 'Restaurant Admin',
    email: defaultEmail,
    password_hash: passwordHash,
    role: 'admin',
    is_active: true,
  });
};

exports.adminEmail = defaultEmail;
exports.adminPassword = defaultPassword;
