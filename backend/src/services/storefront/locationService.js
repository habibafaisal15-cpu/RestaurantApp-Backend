const db = require('../../config/database');
const { NotFoundError } = require('../../errors/AppError');
const { locationMatchesZone } = require('../../utils/helpers');
const { buildStorefrontMenu } = require('../../utils/menuBuilder');
const catalogService = require('../delivery/catalogService');
const marketingDealService = require('../admin/marketingDealService');
const popularityService = require('./popularityService');
const googleMapsService = require('./googleMapsService');
const { IN_STORE_ZONE_ID } = require('../../config/zones');

const UNSERVICEABLE_MESSAGE = "Sorry, we don't deliver here.";

function mapMarketingDealForStorefront(deal) {
  const price = Number(deal.price) || 0;
  const originalPrice =
    deal.originalPrice != null ? Number(deal.originalPrice) : undefined;

  return {
    id: deal.id,
    title: deal.title,
    description: deal.description || '',
    image_url: deal.image || deal.image_url || '',
    discount_type: 'fixed',
    discount_value:
      originalPrice != null ? Math.max(0, originalPrice - price) : price,
    price,
    original_price: originalPrice,
    badge: deal.badge || '',
    product_id: deal.productId || null,
    product_ids: null,
    starts_at: null,
    ends_at: null,
  };
}

async function findActiveZones() {
  return db('delivery_zones')
    .where({ is_active: true })
    .whereNot('id', IN_STORE_ZONE_ID);
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
      message: UNSERVICEABLE_MESSAGE,
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
    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    let geocoded = {};
    try {
      geocoded = await googleMapsService.reverseGeocode(latitude, longitude);
    } catch {
      geocoded = {};
    }

    // Keep the user's exact pin/GPS for zone matching — reverse geocode is address-only.
    return buildLocationPayload({
      ...geocoded,
      latitude,
      longitude,
      formatted_address:
        input.address ||
        input.formatted_address ||
        geocoded.formatted_address ||
        `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
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
  const lat = Number(latitude);
  const lng = Number(longitude);
  let geocoded = {};
  try {
    geocoded = await googleMapsService.reverseGeocode(lat, lng);
  } catch {
    geocoded = {};
  }

  const location = buildLocationPayload({
    ...geocoded,
    latitude: lat,
    longitude: lng,
    formatted_address:
      address ||
      geocoded.formatted_address ||
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  });

  const serviceability = await checkLocationServiceability(location);

  return {
    ...serviceability,
    geocoding_source: geocoded.source || 'gps',
  };
}

async function getMenuForZone(zoneId) {
  await findZoneById(zoneId);

  const [categories, products, pricingDeals, marketingDeals, popular] =
    await Promise.all([
      db('menu_categories')
        .where({ is_active: true })
        .orderBy('display_order', 'asc'),
      db('products')
        .where({ is_active: true, available_for_delivery: true })
        .orderBy('name', 'asc'),
      catalogService.listDeals({ active_only: true }),
      marketingDealService.listDeals(
        {
          active: true,
          showOnCustomer: true,
        },
        { forStorefront: true },
      ),
      popularityService.getPopularSections(3),
    ]);

  const menu = buildStorefrontMenu({
    zoneId,
    categories,
    products,
    deals: marketingDeals.map(mapMarketingDealForStorefront),
    pricingDeals,
  });

  return {
    ...menu,
    best_sellers: popular.best_sellers,
    top_selling_deals: popular.top_selling_deals,
  };
}

module.exports = {
  findActiveZones,
  findZoneById,
  checkLocationServiceability,
  resolveLocationInput,
  selectLiveLocation,
  getMenuForZone,
};
