const { googleMapsApiKey } = require('../../config/env');
const { BadRequestError } = require('../../errors/AppError');

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

function extractAddressComponents(components = []) {
  const find = (type) => components.find((c) => c.types.includes(type))?.long_name || null;

  return {
    pincode: find('postal_code'),
    area: find('sublocality') || find('neighborhood') || find('route'),
    city: find('locality') || find('administrative_area_level_2'),
    state: find('administrative_area_level_1'),
    country: find('country'),
  };
}

function parseGeocodeResult(result) {
  const { lat, lng } = result.geometry.location;
  const parts = extractAddressComponents(result.address_components);

  return {
    formatted_address: result.formatted_address,
    place_id: result.place_id,
    latitude: lat,
    longitude: lng,
    pincode: parts.pincode,
    area: parts.area,
    city: parts.city,
    state: parts.state,
    country: parts.country,
  };
}

function fallbackFromCoordinates(latitude, longitude) {
  return {
    formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    place_id: null,
    latitude,
    longitude,
    pincode: null,
    area: null,
    city: null,
    state: null,
    country: null,
    source: 'coordinates_only',
  };
}

async function googleFetch(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'ZERO_RESULTS') {
    return null;
  }

  if (data.status !== 'OK') {
    throw new BadRequestError(data.error_message || `Google Maps error: ${data.status}`);
  }

  return data;
}

async function reverseGeocode(latitude, longitude) {
  if (!googleMapsApiKey) {
    return nominatimReverse(latitude, longitude);
  }

  try {
    const url = `${GEOCODE_URL}?latlng=${latitude},${longitude}&key=${googleMapsApiKey}`;
    const data = await googleFetch(url);
    if (!data?.results?.length) return nominatimReverse(latitude, longitude);

    return {
      ...parseGeocodeResult(data.results[0]),
      source: 'google',
    };
  } catch {
    return nominatimReverse(latitude, longitude);
  }
}

async function geocodeAddress(address) {
  const query = String(address || '').trim();
  if (!query) {
    throw new BadRequestError('Address is required');
  }

  if (googleMapsApiKey) {
    try {
      const url = `${GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${googleMapsApiKey}`;
      const data = await googleFetch(url);
      if (data?.results?.length) {
        return {
          ...parseGeocodeResult(data.results[0]),
          source: 'google',
        };
      }
    } catch {
      // Fall through to OpenStreetMap
    }
  }

  return nominatimGeocode(query);
}

async function nominatimGeocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RestaurantApp-DeliveryLocations/1.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new BadRequestError('Address lookup failed');
  }

  const results = await response.json();
  if (!Array.isArray(results) || !results.length) {
    throw new BadRequestError('Address not found');
  }

  const result = results[0];
  return {
    formatted_address: result.display_name,
    place_id: result.place_id ? String(result.place_id) : null,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    pincode: null,
    area: null,
    city: null,
    state: null,
    country: null,
    source: 'openstreetmap',
  };
}

async function nominatimReverse(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RestaurantApp-DeliveryLocations/1.0',
        Accept: 'application/json',
      },
    });
    if (!response.ok) return fallbackFromCoordinates(latitude, longitude);
    const result = await response.json();
    if (!result?.display_name) return fallbackFromCoordinates(latitude, longitude);

    return {
      formatted_address: result.display_name,
      place_id: result.place_id ? String(result.place_id) : null,
      latitude: Number(result.lat ?? latitude),
      longitude: Number(result.lon ?? longitude),
      pincode: result.address?.postcode || null,
      area: result.address?.suburb || result.address?.neighbourhood || null,
      city: result.address?.city || result.address?.town || result.address?.village || null,
      state: result.address?.state || null,
      country: result.address?.country || null,
      source: 'openstreetmap',
    };
  } catch {
    return fallbackFromCoordinates(latitude, longitude);
  }
}

async function geocodePlaceId(placeId) {
  if (!googleMapsApiKey) {
    throw new BadRequestError('Google Maps API key is not configured for place lookup');
  }

  const url = `${PLACE_DETAILS_URL}?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry,address_component,place_id&key=${googleMapsApiKey}`;
  const data = await googleFetch(url);
  if (!data?.result) {
    throw new BadRequestError('Place not found');
  }

  const { lat, lng } = data.result.geometry.location;
  const parts = extractAddressComponents(data.result.address_components);

  return {
    formatted_address: data.result.formatted_address,
    place_id: data.result.place_id,
    latitude: lat,
    longitude: lng,
    pincode: parts.pincode,
    area: parts.area,
    city: parts.city,
    state: parts.state,
    country: parts.country,
    source: 'google',
  };
}

async function autocomplete(input, sessionToken) {
  if (!googleMapsApiKey) {
    throw new BadRequestError('Google Maps API key is not configured for autocomplete');
  }

  let url = `${PLACES_AUTOCOMPLETE_URL}?input=${encodeURIComponent(input)}&key=${googleMapsApiKey}`;
  if (sessionToken) {
    url += `&sessiontoken=${encodeURIComponent(sessionToken)}`;
  }

  const data = await googleFetch(url);

  return (data?.predictions || []).map((item) => ({
    place_id: item.place_id,
    description: item.description,
    main_text: item.structured_formatting?.main_text,
    secondary_text: item.structured_formatting?.secondary_text,
  }));
}

function getMapsConfig() {
  return {
    maps_enabled: true,
    browser_api_key: process.env.GOOGLE_MAPS_BROWSER_KEY || null,
    geocoding_enabled: true,
    autocomplete_enabled: Boolean(googleMapsApiKey),
    default_center: { lat: 24.8607, lng: 67.0011 },
    default_zoom: 13,
  };
}

module.exports = {
  reverseGeocode,
  geocodeAddress,
  geocodePlaceId,
  autocomplete,
  getMapsConfig,
};
