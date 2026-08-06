const deliveryService = require('../../services/delivery/deliveryService');
const { createCustomerEmit } = require('../../utils/customerEvents');
const { asyncHandler } = require('../../utils/asyncHandler');

const expireOrders = asyncHandler(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  await deliveryService.expireUnassignedOrders(createCustomerEmit(null));
  res.json({ success: true, message: 'Expired orders processed' });
});

module.exports = { expireOrders };
