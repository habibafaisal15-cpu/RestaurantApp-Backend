const bcrypt = require('bcryptjs');
const db = require('../../config/database');
const { generateId } = require('../../utils/helpers');

const OPS_ACCOUNTS = [
  {
    email: 'kitchen@restaurant.com',
    password: 'Kitchen@123',
    full_name: 'Kitchen Handler',
    role: 'kitchen',
    phone: null,
  },
  {
    email: 'rider@restaurant.com',
    password: 'Rider@123',
    full_name: 'Delivery Rider',
    role: 'rider',
    phone: '03001234567',
  },
];

async function ensurePhoneColumn() {
  const hasPhone = await db.schema.hasColumn('admin_users', 'phone');
  if (!hasPhone) {
    await db.schema.alterTable('admin_users', (table) => {
      table.string('phone', 30).nullable();
    });
  }
}

async function ensureOpsStaffAccounts() {
  await ensurePhoneColumn();

  for (const account of OPS_ACCOUNTS) {
    const existing = await db('admin_users')
      .where({ email: account.email })
      .first();

    const passwordHash = await bcrypt.hash(account.password, 10);

    if (existing) {
      // Always refresh demo passwords so a corrupt hash cannot hang login.
      await db('admin_users')
        .where({ id: existing.id })
        .update({
          role: account.role,
          is_active: true,
          full_name: account.full_name,
          phone: account.phone || existing.phone || null,
          password_hash: passwordHash,
        });
      continue;
    }

    await db('admin_users').insert({
      id: generateId(),
      full_name: account.full_name,
      email: account.email,
      password_hash: passwordHash,
      role: account.role,
      phone: account.phone,
      is_active: true,
    });
  }

  // Keep rider CRM row in sync for assignment.
  const riderStaff = await db('admin_users').where({ email: 'rider@restaurant.com' }).first();
  if (riderStaff?.phone) {
    const existingRider = await db('delivery_riders')
      .where({ phone_number: riderStaff.phone })
      .first();
    if (!existingRider) {
      await db('delivery_riders').insert({
        id: generateId(),
        full_name: riderStaff.full_name,
        phone_number: riderStaff.phone,
        vehicle_number: null,
        vehicle_type: null,
        status: 'Available',
        is_active: true,
      });
    }
  }
}

module.exports = {
  ensureOpsStaffAccounts,
  OPS_ACCOUNTS,
};
