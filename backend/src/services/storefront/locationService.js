const db = require('../../config/database');
const { NotFoundError } = require('../../errors/AppError');
const { locationMatchesZone } = require('../../utils/helpers');
const { buildStorefrontMenu } = require('../../utils/menuBuilder');
const catalogService = require('../delivery/catalogService');
const marketingDealService = require('../admin/marketingDealService');
const googleMapsService = require('./googleMapsService');

function mapMarketingDealForStorefront(deal) {
  const price = Number(deal.price) || 0;
  const originalPrice =
    deal.originalPrice != null ? Number(deal.originalPrice) : undefined;

  return {
    id: deal.id,
    title: deal.title,
    description: deal.description || '',
    image_url: deal.image || '',
    discount_type: 'fixed',
    discount_value:
      originalPrice != null ? Math.max(0, originalPrice - price) : price,
    price,
    original_price: originalPrice,
    badge: deal.badge || '',
    product_ids: null,
    starts_at: null,
    ends_at: null,
  };
}

async function findActiveZones() {
  return db('delivery_zones').where({ is_active: true });
}

async function findZoneById(id) {
  const zone = await db('delivery_zones').where({ id }).first();
  if (!zone) throw new NotFoundError('Delivery zone not found');
  return zone;
}

function buildLocationPayload(geocoded) {
  return {
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    formatted_address: geocoded.formatted_address,
    address: geocoded.formatted_address,
    pincode: geocoded.pincode,
    area: geocoded.area,
    city: geocoded.city,
    place_id: geocoded.place_id,
  };
}

async function checkLocationServiceability(location) {
  const zones = await findActiveZones();
  const matched = zones.find((zone) => locationMatchesZone(location, zone.service_area));

  if (!matched) {
    return {
      serviceable: false,
      message: 'Not deliverable to this location',
      location: {
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        formatted_address: location.formatted_address || location.address || null,
        pincode: location.pincode || null,
        area: location.area || null,
        city: location.city || null,
      },
    };
  }

  return {
    serviceable: true,
    zone: {
      id: matched.id,
      zone_name: matched.zone_name,
      base_fee: Number(matched.base_fee),
      estimated_time: matched.estimated_time,
    },
    location: {
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
      formatted_address: location.formatted_address || location.address || null,
      pincode: location.pincode || null,
      area: location.area || null,
      city: location.city || null,
      place_id: location.place_id || null,
    },
  };
}

async function resolveLocationInput(input) {
  if (input.place_id) {
    return buildLocationPayload(await googleMapsService.geocodePlaceId(input.place_id));
  }

  if (input.latitude != null && input.longitude != null) {
    const geocoded = await googleMapsService.reverseGeocode(input.latitude, input.longitude);
    return buildLocationPayload({
      ...geocoded,
      formatted_address: input.address || input.formatted_address || geocoded.formatted_address,
    });
  }

  if (input.address) {
    return buildLocationPayload(await googleMapsService.geocodeAddress(input.address));
  }

  return {
    latitude: null,
    longitude: null,
    formatted_address: input.address || null,
    address: input.address || null,
    pincode: input.pincode || null,
    area: input.area || null,
    city: input.city || null,
    place_id: null,
  };
}

async function selectLiveLocation({ latitude, longitude, address }) {
  const geocoded = await googleMapsService.reverseGeocode(latitude, longitude);
  const location = buildLocationPayload({
    ...geocoded,
    formatted_address: address || geocoded.formatted_address,
  });

  const serviceability = await checkLocationServiceability(location);

  return {
    ...serviceability,
    geocoding_source: geocoded.source || 'google',
  };
}

async function getMenuForZone(zoneId) {
  await findZoneById(zoneId);

  const categories = await db('menu_categories')
    .where({ is_active: true })
    .orderBy('display_order', 'asc');

  const products = await db('products')
    .where({ is_active: true, available_for_delivery: true })
    .orderBy('name', 'asc');

  const pricingDeals = await catalogService.listDeals({ active_only: true });
  const marketingDeals = await marketingDealService.listDeals({
    active: true,
    showOnCustomer: true,
  });

  return buildStorefrontMenu({
    zoneId,
    categories,
    products,
    deals: marketingDeals.map(mapMarketingDealForStorefront),
    pricingDeals,
  });
}

module.exports = {
  findActiveZones,
  findZoneById,
  checkLocationServiceability,
  resolveLocationInput,
  selectLiveLocation,
  getMenuForZone,
};
