const db = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../errors/AppError');
const { generateId } = require('../../utils/helpers');

function mapRiderStatus(status) {
  const normalized = String(status || 'Available').toLowerCase();
  if (normalized === 'available') return 'available';
  if (normalized === 'busy' || normalized === 'on_delivery') return 'busy';
  if (normalized === 'offline') return 'offline';
  return normalized;
}

function toDbStatus(status) {
  const map = {
    available: 'Available',
    busy: 'Busy',
    offline: 'Offline',
  };
  return map[status] || status;
}

function formatRider(row) {
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone_number,
    vehicleNumber: row.vehicle_number || '',
    vehicleType: row.vehicle_type || '',
    status: mapRiderStatus(row.status),
    active: row.is_active !== false,
    createdAt: row.created_at,
  };
}

async function listRiders(filters = {}) {
  let query = db('delivery_riders').orderBy('full_name', 'asc');

  if (filters.active === 'true' || filters.active === true) {
    query = query.where('is_active', true);
  } else if (filters.active === 'false' || filters.active === false) {
    query = query.where('is_active', false);
  }

  if (filters.status) {
    query = query.where('status', toDbStatus(filters.status));
  }

  const rows = await query;
  return rows.map(formatRider);
}

async function getRiderById(id) {
  const row = await db('delivery_riders').where({ id }).first();
  if (!row) throw new NotFoundError('Rider not found');
  return formatRider(row);
}

async function createRider(payload) {
  const existing = await db('delivery_riders')
    .where({ phone_number: payload.phone })
    .first();

  if (existing) {
    throw new BadRequestError('A rider with this phone number already exists');
  }

  const id = generateId();
  const [row] = await db('delivery_riders')
    .insert({
      id,
      full_name: payload.name,
      phone_number: payload.phone,
      vehicle_number: payload.vehicleNumber || null,
      vehicle_type: payload.vehicleType || null,
      status: 'Available',
      is_active: true,
    })
    .returning('*');

  return formatRider(row);
}

async function updateRider(id, payload) {
  const existing = await db('delivery_riders').where({ id }).first();
  if (!existing) throw new NotFoundError('Rider not found');

  const updates = {};
  if (payload.name !== undefined) updates.full_name = payload.name;
  if (payload.phone !== undefined) updates.phone_number = payload.phone;
  if (payload.vehicleNumber !== undefined) updates.vehicle_number = payload.vehicleNumber;
  if (payload.vehicleType !== undefined) updates.vehicle_type = payload.vehicleType;
  if (payload.status !== undefined) updates.status = toDbStatus(payload.status);
  if (payload.active !== undefined) updates.is_active = payload.active;

  if (Object.keys(updates).length === 0) {
    return formatRider(existing);
  }

  const [row] = await db('delivery_riders').where({ id }).update(updates).returning('*');
  return formatRider(row);
}

async function toggleRiderActive(id) {
  const rider = await getRiderById(id);
  return updateRider(id, { active: !rider.active });
}

module.exports = {
  listRiders,
  getRiderById,
  createRider,
  updateRider,
  toggleRiderActive,
};
