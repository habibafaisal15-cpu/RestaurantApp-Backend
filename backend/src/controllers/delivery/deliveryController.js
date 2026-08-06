const deliveryService = require('../../services/delivery/deliveryService');

async function getDashboard(req, res) {
  const data = await deliveryService.getDashboard({
    status: req.query.status,
    search: req.query.search,
  });
  res.json({ success: true, data });
}

async function getSummary(_req, res) {
  const summary = await deliveryService.getSummary();
  res.json({ success: true, data: summary });
}

async function listOrders(req, res) {
  const orders = await deliveryService.listOrders({
    status: req.query.status,
    search: req.query.search,
  });
  res.json({ success: true, data: orders });
}

async function getOrder(req, res) {
  const order = await deliveryService.getOrderById(req.params.id);
  res.json({ success: true, data: order });
}

async function updateStatus(req, res) {
  const { createCustomerEmit } = require('../../utils/customerEvents');
  const emit = createCustomerEmit(req.app.get('io'));
  const order = await deliveryService.updateOrderStatus(
    req.params.id,
    { ...req.body, set_by: req.body.set_by || req.admin.full_name },
    emit,
  );
  res.json({ success: true, data: order });
}

async function assignRider(req, res) {
  const { createCustomerEmit } = require('../../utils/customerEvents');
  const emit = createCustomerEmit(req.app.get('io'));
  const order = await deliveryService.assignRider(
    req.params.id,
    { ...req.body, set_by: req.body.set_by || req.admin.full_name },
    emit,
  );
  res.json({ success: true, data: order });
}

async function getTracking(req, res) {
  const timeline = await deliveryService.getTrackingTimeline(req.params.id);
  res.json({ success: true, data: timeline });
}

module.exports = {
  getDashboard,
  getSummary,
  listOrders,
  getOrder,
  updateStatus,
  assignRider,
  getTracking,
};
