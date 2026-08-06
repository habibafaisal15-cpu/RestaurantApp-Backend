const trackingService = require('../../services/tracking/trackingService');

async function trackOrder(req, res) {
  const data = await trackingService.getTrackingByToken(req.params.token);
  res.json({ success: true, data });
}

module.exports = { trackOrder };
