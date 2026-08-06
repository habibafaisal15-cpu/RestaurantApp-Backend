const locationService = require('../../services/storefront/locationService');
const orderService = require('../../services/storefront/orderService');
const deliveryService = require('../../services/delivery/deliveryService');
const settingsService = require('../../services/admin/settingsService');
const heroService = require('../../services/admin/heroService');
const { WS_EVENTS } = require('../../../../shared/constants/orderStatus');
const { asyncHandler } = require('../../utils/asyncHandler');
const {
  createCustomerEmit,
  emitCustomerOrderEvent,
} = require('../../utils/customerEvents');

const getMenu = asyncHandler(async (req, res) => {
  const { zone_id: zoneId } = req.query;
  if (!zoneId) {
    return res.status(400).json({
      success: false,
      message: 'zone_id query parameter is required',
    });
  }

  const menu = await locationService.getMenuForZone(zoneId);
  res.json({ success: true, data: menu });
});

const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body);
  const adminOrder = await deliveryService.getOrderById(order.id);

  const io = req.app.get('io');
  io.to('admin:delivery').emit(WS_EVENTS.ORDER_CREATED, {
    order_id: order.id,
    order_number: order.order_number,
    order: adminOrder,
  });

  const emit = createCustomerEmit(io);
  emitCustomerOrderEvent(
    emit,
    WS_EVENTS.STATUS_CHANGED,
    {
      id: order.id,
      order_number: order.order_number,
      order_status: order.order_status,
      tracking_token: order.tracking_token,
      rider_name: null,
      rider_phone: null,
    },
    `Order ${order.order_number} received`,
  );

  res.status(201).json({ success: true, data: order });
});

const getSettings = asyncHandler(async (_req, res) => {
  const data = await settingsService.getSettings();
  res.json({ success: true, data });
});

const getHero = asyncHandler(async (_req, res) => {
  const data = await heroService.getHeroContent();
  res.json({ success: true, data });
});

module.exports = {
  getMenu,
  getSettings,
  getHero,
  createOrder,
};
