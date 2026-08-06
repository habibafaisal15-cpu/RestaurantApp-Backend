const express = require('express');
const cronController = require('../../../controllers/cron/cronController');

const router = express.Router();

router.get('/expire-orders', cronController.expireOrders);

module.exports = router;
