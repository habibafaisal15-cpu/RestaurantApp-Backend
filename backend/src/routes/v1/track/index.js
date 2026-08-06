const express = require('express');
const trackController = require('../../../controllers/track/trackController');

const router = express.Router();

router.get('/:token', trackController.trackOrder);

module.exports = router;
