const express = require('express');
const storefrontController = require('../../../controllers/storefront/storefrontController');
const locationController = require('../../../controllers/storefront/locationController');
const {
  validateBody,
  checkLocationSchema,
  selectLiveLocationSchema,
  geocodeAddressSchema,
  geocodePlaceSchema,
  coordinatesSchema,
  createOrderSchema,
} = require('../../../validators/deliverySchemas');

const router = express.Router();

router.get('/maps/config', locationController.getMapsConfig);

router.get('/location/autocomplete', locationController.autocomplete);

router.post(
  '/location/reverse-geocode',
  validateBody(coordinatesSchema),
  locationController.reverseGeocode,
);

router.post(
  '/location/geocode',
  validateBody(geocodeAddressSchema),
  locationController.geocodeAddress,
);

router.post(
  '/location/place',
  validateBody(geocodePlaceSchema),
  locationController.geocodePlace,
);

router.post(
  '/location/select-live',
  validateBody(selectLiveLocationSchema),
  locationController.selectLiveLocation,
);

router.post(
  '/check-location',
  validateBody(checkLocationSchema),
  locationController.checkLocation,
);

router.get('/settings', storefrontController.getSettings);
router.get('/hero', storefrontController.getHero);
router.get('/menu', storefrontController.getMenu);

router.post(
  '/orders',
  validateBody(createOrderSchema),
  storefrontController.createOrder,
);

module.exports = router;
