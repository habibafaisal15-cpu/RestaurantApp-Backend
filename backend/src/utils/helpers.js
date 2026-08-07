const crypto = require('crypto');
const {
  pointInBounds,
  pointInPolygon,
  pointInCircle,
} = require('./geo');

function generateId() {
  return crypto.randomUUID();
}

function generateTrackingToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateOrderNumber(sequence) {
  return `#DLV-${String(sequence).padStart(5, '0')}`;
}

function parseServiceArea(raw) {
  if (!raw) return { pincodes: [], areas: [] };
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { pincodes: [], areas: [] };
  }
}

function locationMatchesZone(location, serviceArea) {
  const area = parseServiceArea(serviceArea);
  const pincode = (location.pincode || '').trim();
  const areaName = (location.area || location.address || location.city || '')
    .trim()
    .toLowerCase();
  const address = (location.address || location.formatted_address || '')
    .trim()
    .toLowerCase();

  const lat = location.latitude ?? location.lat;
  const lng = location.longitude ?? location.lng;

  // Hub zones (admin Delivery Locations): GPS must be inside the delivery radius.
  // Do not fall back to loose area-name matching when a radius hub is configured —
  // that was incorrectly accepting far-away pins whose reverse-geocode text matched.
  if (lat != null && lng != null) {
    const hasHubRadius = Boolean(area.center && area.radius_km);
    if (hasHubRadius) {
      return pointInCircle(lat, lng, area.center, area.radius_km);
    }
    if (area.bounds && pointInBounds(lat, lng, area.bounds)) {
      return true;
    }
    if (area.polygon && pointInPolygon(lat, lng, area.polygon)) {
      return true;
    }
    // GPS present but this zone has no geo shape — skip text matching for this zone.
    if (area.center || area.bounds || area.polygon) {
      return false;
    }
  }

  if (pincode && area.pincodes?.includes(pincode)) {
    return true;
  }

  const areaNames = area.areas || [];
  for (const name of areaNames) {
    const lower = name.toLowerCase();
    if (areaName.includes(lower) || address.includes(lower)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  generateId,
  generateTrackingToken,
  generateOrderNumber,
  parseServiceArea,
  locationMatchesZone,
};
