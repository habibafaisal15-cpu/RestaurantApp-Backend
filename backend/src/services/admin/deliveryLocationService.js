const db = require('../../config/database');
const { BadRequestError, NotFoundError } = require('../../errors/AppError');
const { generateId, parseServiceArea } = require('../../utils/helpers');
const { IN_STORE_ZONE_ID } = require('../../config/zones');

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_BASE_FEE = 150;
const DEFAULT_ETA = '30-45 min';

function formatLocation(row) {
  const area = parseServiceArea(row.service_area);
  const latitude = Number(area.center?.lat ?? area.latitude ?? 0);
  const longitude = Number(area.center?.lng ?? area.longitude ?? 0);
  const radiusKm = Number(area.radius_km ?? DEFAULT_RADIUS_KM) || DEFAULT_RADIUS_KM;

  return {
    id: row.id,
    name: row.zone_name,
    address: area.address || '',
    latitude,
    longitude,
    radius_km: radiusKm,
    is_active: Boolean(row.is_active),
    notes: area.notes || '',
    base_fee: Number(row.base_fee),
    estimated_time: row.estimated_time,
    created_at: row.created_at,
    updated_at: area.updated_at || row.created_at,
  };
}

function buildServiceArea(payload, existingArea = {}) {
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const radiusKm = Number(payload.radius_km ?? existingArea.radius_km ?? DEFAULT_RADIUS_KM);

  return {
    center: {
      lat: latitude,
      lng: longitude,
    },
    radius_km: radiusKm,
    address: payload.address != null ? String(payload.address).trim() : existingArea.address || '',
    notes: payload.notes != null ? String(payload.notes).trim() : existingArea.notes || '',
    pincodes: existingArea.pincodes || [],
    areas: [],
    updated_at: new Date().toISOString(),
  };
}

function assertEditableZone(id) {
  if (id === IN_STORE_ZONE_ID) {
    throw new BadRequestError('In-store zone cannot be managed from Delivery Locations');
  }
}

async function listLocations(filters = {}) {
  let query = db('delivery_zones').whereNot('id', IN_STORE_ZONE_ID).orderBy('zone_name', 'asc');

  if (filters.active === 'true' || filters.active === true) {
    query = query.where({ is_active: true });
  } else if (filters.active === 'false' || filters.active === false) {
    query = query.where({ is_active: false });
  }

  if (filters.is_active === 'true' || filters.is_active === true) {
    query = query.where({ is_active: true });
  } else if (filters.is_active === 'false' || filters.is_active === false) {
    query = query.where({ is_active: false });
  }

  const rows = await query;
  let list = rows.map(formatLocation);

  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    list = list.filter(
      (location) =>
        location.name.toLowerCase().includes(q) ||
        location.address.toLowerCase().includes(q) ||
        location.notes.toLowerCase().includes(q),
    );
  }

  return list;
}

async function getLocationById(id) {
  assertEditableZone(id);
  const row = await db('delivery_zones').where({ id }).first();
  if (!row) throw new NotFoundError('Delivery location not found');
  return formatLocation(row);
}

async function createLocation(payload) {
  const id = generateId();
  const serviceArea = buildServiceArea(payload);

  await db('delivery_zones').insert({
    id,
    zone_name: String(payload.name).trim(),
    base_fee: payload.base_fee != null ? Number(payload.base_fee) : DEFAULT_BASE_FEE,
    estimated_time: payload.estimated_time || DEFAULT_ETA,
    service_area: serviceArea,
    is_active: payload.is_active !== false,
  });

  return getLocationById(id);
}

async function updateLocation(id, payload) {
  assertEditableZone(id);
  const row = await db('delivery_zones').where({ id }).first();
  if (!row) throw new NotFoundError('Delivery location not found');

  const existingArea = parseServiceArea(row.service_area);
  const nextPayload = {
    name: payload.name != null ? payload.name : row.zone_name,
    address: payload.address != null ? payload.address : existingArea.address,
    notes: payload.notes != null ? payload.notes : existingArea.notes,
    latitude:
      payload.latitude != null ? payload.latitude : existingArea.center?.lat,
    longitude:
      payload.longitude != null ? payload.longitude : existingArea.center?.lng,
    radius_km:
      payload.radius_km != null ? payload.radius_km : existingArea.radius_km,
  };

  const updates = {
    zone_name: String(nextPayload.name).trim(),
    service_area: buildServiceArea(nextPayload, existingArea),
  };

  if (payload.is_active != null) {
    updates.is_active = Boolean(payload.is_active);
  }
  if (payload.base_fee != null) {
    updates.base_fee = Number(payload.base_fee);
  }
  if (payload.estimated_time != null) {
    updates.estimated_time = payload.estimated_time;
  }

  await db('delivery_zones').where({ id }).update(updates);
  return getLocationById(id);
}

async function toggleLocationActive(id) {
  assertEditableZone(id);
  const row = await db('delivery_zones').where({ id }).first();
  if (!row) throw new NotFoundError('Delivery location not found');

  await db('delivery_zones')
    .where({ id })
    .update({ is_active: !row.is_active });

  return getLocationById(id);
}

async function deleteLocation(id) {
  assertEditableZone(id);
  const row = await db('delivery_zones').where({ id }).first();
  if (!row) throw new NotFoundError('Delivery location not found');

  const orderUsingZone = await db('delivery_orders').where({ zone_id: id }).first();
  if (orderUsingZone) {
    await db('delivery_zones').where({ id }).update({ is_active: false });
    return { id, deleted: false, deactivated: true };
  }

  await db('delivery_zones').where({ id }).del();
  return { id, deleted: true };
}

module.exports = {
  listLocations,
  getLocationById,
  createLocation,
  updateLocation,
  toggleLocationActive,
  deleteLocation,
  formatLocation,
};
