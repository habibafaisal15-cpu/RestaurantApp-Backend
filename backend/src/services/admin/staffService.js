const bcrypt = require('bcryptjs');
const db = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../errors/AppError');
const { generateId } = require('../../utils/helpers');

const ALLOWED_ROLES = ['admin', 'super-admin', 'manager', 'cashier', 'kitchen', 'rider'];

let phoneColumnCache = null;

async function hasPhoneColumn() {
  if (phoneColumnCache == null) {
    phoneColumnCache = await db.schema.hasColumn('admin_users', 'phone');
  }
  return phoneColumnCache;
}

function formatStaff(row) {
  if (!row) return null;
  return {
    id: row.id,
    full_name: row.full_name,
    name: row.full_name,
    email: row.email,
    phone: row.phone || null,
    role: row.role || 'admin',
    active: row.is_active !== false,
    is_active: row.is_active !== false,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

async function syncRiderProfile(staff) {
  if (!staff || String(staff.role).toLowerCase() !== 'rider') return;
  const phone = String(staff.phone || '').trim();
  if (!phone) return;

  const existing = await db('delivery_riders').where({ phone_number: phone }).first();
  if (existing) {
    await db('delivery_riders').where({ id: existing.id }).update({
      full_name: staff.name || staff.full_name,
      is_active: staff.active !== false,
      status: staff.active === false ? 'Offline' : existing.status || 'Available',
    });
    return;
  }

  await db('delivery_riders').insert({
    id: generateId(),
    full_name: staff.name || staff.full_name,
    phone_number: phone,
    vehicle_number: null,
    vehicle_type: null,
    status: 'Available',
    is_active: staff.active !== false,
  });
}

function normalizeRole(role) {
  const value = String(role || 'admin').trim().toLowerCase();
  if (value === 'store-admin' || value === 'store_admin') return 'admin';
  return ALLOWED_ROLES.includes(value) ? value : 'admin';
}

async function baseSelect() {
  const cols = [
    'id',
    'full_name',
    'email',
    'role',
    'is_active',
    'created_at',
    'last_login_at',
  ];
  if (await hasPhoneColumn()) cols.splice(3, 0, 'phone');
  return cols;
}

async function listStaff(filters = {}) {
  let query = db('admin_users').select(await baseSelect());

  if (filters.active === true || filters.active === 'true') {
    query = query.where({ is_active: true });
  } else if (filters.active === false || filters.active === 'false') {
    query = query.where({ is_active: false });
  }

  if (filters.role) {
    query = query.where({ role: normalizeRole(filters.role) });
  }

  if (filters.search) {
    const term = `%${String(filters.search).trim().toLowerCase()}%`;
    const phoneReady = await hasPhoneColumn();
    query = query.andWhere((builder) => {
      builder
        .whereRaw('LOWER(full_name) LIKE ?', [term])
        .orWhereRaw('LOWER(email) LIKE ?', [term]);
      if (phoneReady) {
        builder.orWhereRaw("LOWER(COALESCE(phone, '')) LIKE ?", [term]);
      }
    });
  }

  const rows = await query.orderBy('created_at', 'asc');
  return rows.map(formatStaff);
}

async function getStaffById(id) {
  const row = await db('admin_users')
    .select(await baseSelect())
    .where({ id })
    .first();

  if (!row) throw new NotFoundError('Staff member not found');
  return formatStaff(row);
}

async function createStaff(payload) {
  const email = String(payload.email || '')
    .toLowerCase()
    .trim();
  const fullName = String(payload.full_name || payload.name || '').trim();
  const password = String(payload.password || '');

  if (!fullName) throw new BadRequestError('Name is required');
  if (!email) throw new BadRequestError('Email is required');
  if (password.length < 6) {
    throw new BadRequestError('Password must be at least 6 characters');
  }

  const existing = await db('admin_users').where({ email }).first();
  if (existing) {
    throw new BadRequestError('An account with this email already exists');
  }

  if (normalizeRole(payload.role) === 'rider') {
    const phone = payload.phone ? String(payload.phone).trim() : '';
    if (!phone) {
      throw new BadRequestError('Phone is required for rider staff accounts');
    }
  }

  const id = generateId();
  const passwordHash = await bcrypt.hash(password, 10);
  const row = {
    id,
    full_name: fullName.slice(0, 100),
    email: email.slice(0, 150),
    password_hash: passwordHash,
    role: normalizeRole(payload.role),
    is_active: payload.active !== false && payload.is_active !== false,
  };

  if (await hasPhoneColumn()) {
    row.phone = payload.phone ? String(payload.phone).trim().slice(0, 30) : null;
  }

  await db('admin_users').insert(row);
  const staff = await getStaffById(id);
  await syncRiderProfile(staff);
  return staff;
}

async function updateStaff(id, payload, actorId) {
  const existing = await db('admin_users').where({ id }).first();
  if (!existing) throw new NotFoundError('Staff member not found');

  const updates = {};

  if (payload.full_name != null || payload.name != null) {
    const fullName = String(payload.full_name || payload.name || '').trim();
    if (!fullName) throw new BadRequestError('Name is required');
    updates.full_name = fullName.slice(0, 100);
  }

  if (payload.email != null) {
    const email = String(payload.email).toLowerCase().trim();
    if (!email) throw new BadRequestError('Email is required');
    const conflict = await db('admin_users')
      .where({ email })
      .whereNot({ id })
      .first();
    if (conflict) {
      throw new BadRequestError('An account with this email already exists');
    }
    updates.email = email.slice(0, 150);
  }

  if (payload.phone !== undefined && (await hasPhoneColumn())) {
    updates.phone = payload.phone
      ? String(payload.phone).trim().slice(0, 30)
      : null;
  }

  if (payload.role != null) {
    updates.role = normalizeRole(payload.role);
  }

  if (payload.active !== undefined || payload.is_active !== undefined) {
    const nextActive =
      payload.active !== undefined ? payload.active !== false : payload.is_active !== false;
    if (actorId && actorId === id && !nextActive) {
      throw new BadRequestError('You cannot deactivate your own account');
    }
    updates.is_active = nextActive;
  }

  if (payload.password) {
    const password = String(payload.password);
    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters');
    }
    updates.password_hash = await bcrypt.hash(password, 10);
  }

  if (!Object.keys(updates).length) {
    throw new BadRequestError('Provide at least one field to update');
  }

  await db('admin_users').where({ id }).update(updates);
  const staff = await getStaffById(id);
  await syncRiderProfile(staff);
  return staff;
}

async function toggleStaffActive(id, actorId) {
  const existing = await db('admin_users').where({ id }).first();
  if (!existing) throw new NotFoundError('Staff member not found');

  if (actorId && actorId === id) {
    throw new BadRequestError('You cannot deactivate your own account');
  }

  await db('admin_users')
    .where({ id })
    .update({ is_active: !existing.is_active });

  return getStaffById(id);
}

module.exports = {
  listStaff,
  getStaffById,
  createStaff,
  updateStaff,
  toggleStaffActive,
  ALLOWED_ROLES,
};
