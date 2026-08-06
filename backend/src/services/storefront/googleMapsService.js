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
    return fallbackFromCoordinates(latitude, longitude);
  }

  const url = `${GEOCODE_URL}?latlng=${latitude},${longitude}&key=${googleMapsApiKey}`;
  const data = await googleFetch(url);
  if (!data?.results?.length) return fallbackFromCoordinates(latitude, longitude);

  return {
    ...parseGeocodeResult(data.results[0]),
    source: 'google',
  };
}

async function geocodeAddress(address) {
  if (!googleMapsApiKey) {
    throw new BadRequestError('Google Maps API key is not configured for address search');
  }

  const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;
  const data = await googleFetch(url);
  if (!data?.results?.length) {
    throw new BadRequestError('Address not found');
  }

  return {
    ...parseGeocodeResult(data.results[0]),
    source: 'google',
  };
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
    maps_enabled: Boolean(googleMapsApiKey || process.env.GOOGLE_MAPS_BROWSER_KEY),
    browser_api_key: process.env.GOOGLE_MAPS_BROWSER_KEY || null,
    geocoding_enabled: Boolean(googleMapsApiKey),
    autocomplete_enabled: Boolean(googleMapsApiKey),
    default_center: { lat: 31.5497, lng: 74.3436 },
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
