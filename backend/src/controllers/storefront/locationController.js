const locationService = require('../../services/storefront/locationService');
const googleMapsService = require('../../services/storefront/googleMapsService');

async function getMapsConfig(_req, res) {
  res.json({ success: true, data: googleMapsService.getMapsConfig() });
}

async function reverseGeocode(req, res) {
  const { latitude, longitude } = req.body;
  const geocoded = await googleMapsService.reverseGeocode(latitude, longitude);
  res.json({ success: true, data: geocoded });
}

async function geocodeAddress(req, res) {
  const geocoded = await googleMapsService.geocodeAddress(req.body.address);
  res.json({ success: true, data: geocoded });
}

async function geocodePlace(req, res) {
  const geocoded = await googleMapsService.geocodePlaceId(req.body.place_id);
  res.json({ success: true, data: geocoded });
}

async function autocomplete(req, res) {
  const predictions = await googleMapsService.autocomplete(
    req.query.input,
    req.query.session_token,
  );
  res.json({ success: true, data: predictions });
}

async function selectLiveLocation(req, res) {
  const result = await locationService.selectLiveLocation(req.body);
  res.json({ success: true, data: result });
}

async function checkLocation(req, res) {
  const location = await locationService.resolveLocationInput(req.body);
  const result = await locationService.checkLocationServiceability(location);
  res.json({ success: true, data: result });
}

module.exports = {
  getMapsConfig,
  reverseGeocode,
  geocodeAddress,
  geocodePlace,
  autocomplete,
  selectLiveLocation,
  checkLocation,
};
