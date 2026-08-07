const locationService = require('../../services/storefront/locationService');
const googleMapsService = require('../../services/storefront/googleMapsService');
const { asyncHandler } = require('../../utils/asyncHandler');

const getMapsConfig = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: googleMapsService.getMapsConfig() });
});

const reverseGeocode = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const geocoded = await googleMapsService.reverseGeocode(latitude, longitude);
  res.json({ success: true, data: geocoded });
});

const geocodeAddress = asyncHandler(async (req, res) => {
  const geocoded = await googleMapsService.geocodeAddress(req.body.address);
  res.json({ success: true, data: geocoded });
});

const geocodePlace = asyncHandler(async (req, res) => {
  const geocoded = await googleMapsService.geocodePlaceId(req.body.place_id);
  res.json({ success: true, data: geocoded });
});

const autocomplete = asyncHandler(async (req, res) => {
  const predictions = await googleMapsService.autocomplete(
    req.query.input,
    req.query.session_token,
  );
  res.json({ success: true, data: predictions });
});

const selectLiveLocation = asyncHandler(async (req, res) => {
  const result = await locationService.selectLiveLocation(req.body);
  res.json({ success: true, data: result });
});

const checkLocation = asyncHandler(async (req, res) => {
  const location = await locationService.resolveLocationInput(req.body);
  const result = await locationService.checkLocationServiceability(location);
  res.json({ success: true, data: result });
});

module.exports = {
  getMapsConfig,
  reverseGeocode,
  geocodeAddress,
  geocodePlace,
  autocomplete,
  selectLiveLocation,
  checkLocation,
};
