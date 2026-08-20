const settingsService = require('../../services/admin/settingsService');
const heroService = require('../../services/admin/heroService');
const slipService = require('../../services/admin/slipService');
const salesService = require('../../services/admin/salesService');
const riderService = require('../../services/admin/riderService');
const posOrderService = require('../../services/admin/posOrderService');
const marketingDealService = require('../../services/admin/marketingDealService');
const deliveryLocationService = require('../../services/admin/deliveryLocationService');
const staffService = require('../../services/admin/staffService');
const inventoryService = require('../../services/admin/inventoryService');
const popularityService = require('../../services/storefront/popularityService');
const { createMenuEmit, MENU_WS_EVENTS } = require('../../utils/menuEvents');

function emitMarketingDealChange(req, action, deal) {
  try {
    popularityService.clearPopularCache?.();
  } catch {
    // ignore cache clear failures
  }

  const emit = createMenuEmit(req.app.get('io'));
  if (!emit) return;

  if (action === 'deal_created') {
    emit(MENU_WS_EVENTS.DEAL_CREATED, { deal });
  } else if (action === 'deal_updated') {
    emit(MENU_WS_EVENTS.DEAL_UPDATED, { deal });
  } else if (action === 'deal_deleted') {
    emit(MENU_WS_EVENTS.DEAL_DELETED, { deal });
  }

  emit(MENU_WS_EVENTS.UPDATED, { action, deal });
}

async function getSettings(_req, res) {
  const data = await settingsService.getSettings();
  res.json({ success: true, data });
}

async function updateSettings(req, res) {
  const data = await settingsService.updateSettings(req.body);
  res.json({ success: true, data });
}

async function getHero(_req, res) {
  const data = await heroService.getHeroContent();
  res.json({ success: true, data });
}

async function updateHero(req, res) {
  const data = await heroService.updateHeroContent(req.body);
  res.json({ success: true, data });
}

async function updateHeroSideCards(req, res) {
  const sideCards = await heroService.updateSideCards(req.body.sideCards);
  res.json({ success: true, data: sideCards });
}

async function updateHeroSlides(req, res) {
  const slides = await heroService.updateSlides(req.body.slides);
  res.json({ success: true, data: slides });
}

async function updateHeroTopDeals(req, res) {
  const topDeals = await heroService.updateTopDeals(req.body.topDeals);
  res.json({ success: true, data: topDeals });
}

async function generateSlip(req, res) {
  const { orderId, slipType } = req.body;
  const data = await slipService.generateSlip(orderId, slipType);
  res.status(201).json({ success: true, data });
}

async function listSlips(req, res) {
  const data = await slipService.listSlips(req.query);
  res.json({ success: true, data });
}

async function getSlipsByOrder(req, res) {
  const data = await slipService.getSlipsByOrder(req.params.orderId);
  res.json({ success: true, data });
}

async function reprintSlip(req, res) {
  const data = await slipService.reprintSlip(req.params.id);
  res.json({ success: true, data });
}

async function getSalesSummary(req, res) {
  const data = await salesService.getSummary(req.query);
  res.json({ success: true, data });
}

async function getSalesByItem(req, res) {
  const data = await salesService.getByItem(req.query);
  res.json({ success: true, data });
}

async function getSalesByCategory(req, res) {
  const data = await salesService.getByCategory(req.query);
  res.json({ success: true, data });
}

async function getSalesByDay(req, res) {
  const data = await salesService.getByDay(req.query);
  res.json({ success: true, data });
}

async function getSalesCustomers(req, res) {
  const data = await salesService.getCustomers(req.query);
  res.json({ success: true, data });
}

async function getSalesDailyClosing(req, res) {
  const data = await salesService.getDailyClosing(req.query);
  res.json({ success: true, data });
}

async function getSalesCredit(req, res) {
  const data = await salesService.getCreditReport(req.query);
  res.json({ success: true, data });
}

async function getSalesProfit(req, res) {
  const data = await salesService.getProfitByProduct(req.query);
  res.json({ success: true, data });
}

async function listSalesPayables(req, res) {
  const data = await salesService.listPayables(req.query);
  res.json({ success: true, data });
}

async function createSalesPayable(req, res) {
  const data = await salesService.createPayable(req.body);
  res.status(201).json({ success: true, data });
}

async function settleSalesPayable(req, res) {
  const data = await salesService.settlePayable(req.params.id, req.body);
  res.json({ success: true, data });
}

async function listRiders(req, res) {
  const data = await riderService.listRiders(req.query);
  res.json({ success: true, data });
}

async function getRider(req, res) {
  const data = await riderService.getRiderById(req.params.id);
  res.json({ success: true, data });
}

async function createRider(req, res) {
  const data = await riderService.createRider(req.body);
  res.status(201).json({ success: true, data });
}

async function updateRider(req, res) {
  const data = await riderService.updateRider(req.params.id, req.body);
  res.json({ success: true, data });
}

async function toggleRider(req, res) {
  const data = await riderService.toggleRiderActive(req.params.id);
  res.json({ success: true, data });
}

async function listDeliveryLocations(req, res) {
  const data = await deliveryLocationService.listLocations(req.query);
  res.json({ success: true, data });
}

async function getDeliveryLocation(req, res) {
  const data = await deliveryLocationService.getLocationById(req.params.id);
  res.json({ success: true, data });
}

async function createDeliveryLocation(req, res) {
  const data = await deliveryLocationService.createLocation(req.body);
  res.status(201).json({ success: true, data });
}

async function updateDeliveryLocation(req, res) {
  const data = await deliveryLocationService.updateLocation(req.params.id, req.body);
  res.json({ success: true, data });
}

async function toggleDeliveryLocation(req, res) {
  const data = await deliveryLocationService.toggleLocationActive(req.params.id);
  res.json({ success: true, data });
}

async function deleteDeliveryLocation(req, res) {
  const data = await deliveryLocationService.deleteLocation(req.params.id);
  res.json({ success: true, data });
}

async function createWalkInOrder(req, res) {
  const data = await posOrderService.createWalkInOrder(req.body);

  const io = req.app.get('io');
  if (io) {
    const { WS_EVENTS } = require('../../../../shared/constants/orderStatus');
    io.to('admin:delivery').emit(WS_EVENTS.ORDER_CREATED, {
      order_id: data.id,
      order_number: data.orderNumber,
      order: data,
    });
  }

  res.status(201).json({ success: true, data });
}

async function requestBill(req, res) {
  const data = await posOrderService.requestBill(req.params.id, req.body);
  res.json({ success: true, data });
}

async function listMarketingDeals(req, res) {
  const data = await marketingDealService.listDeals(req.query);
  res.json({ success: true, data });
}

async function getMarketingDeal(req, res) {
  const data = await marketingDealService.getDealById(req.params.id);
  res.json({ success: true, data });
}

async function createMarketingDeal(req, res) {
  const data = await marketingDealService.createDeal(req.body);
  emitMarketingDealChange(req, 'deal_created', data);
  res.status(201).json({ success: true, data });
}

async function updateMarketingDeal(req, res) {
  const data = await marketingDealService.updateDeal(req.params.id, req.body);
  emitMarketingDealChange(req, 'deal_updated', data);
  res.json({ success: true, data });
}

async function removeMarketingDeal(req, res) {
  const data = await marketingDealService.removeDeal(req.params.id);
  emitMarketingDealChange(req, 'deal_deleted', data);
  res.json({ success: true, data });
}

async function listStaff(req, res) {
  const data = await staffService.listStaff(req.query);
  res.json({ success: true, data });
}

async function getStaff(req, res) {
  const data = await staffService.getStaffById(req.params.id);
  res.json({ success: true, data });
}

async function createStaff(req, res) {
  const data = await staffService.createStaff(req.body);
  res.status(201).json({ success: true, data });
}

async function updateStaff(req, res) {
  const data = await staffService.updateStaff(req.params.id, req.body, req.admin?.id);
  res.json({ success: true, data });
}

async function toggleStaff(req, res) {
  const data = await staffService.toggleStaffActive(req.params.id, req.admin?.id);
  res.json({ success: true, data });
}

async function listInventory(req, res) {
  const data = await inventoryService.listInventory(req.query);
  res.json({ success: true, data });
}

async function getInventorySummary(req, res) {
  const data = await inventoryService.getInventorySummary();
  res.json({ success: true, data });
}

async function getInventoryItem(req, res) {
  const data = await inventoryService.getInventoryItem(req.params.id);
  res.json({ success: true, data });
}

async function updateInventoryItem(req, res) {
  const data = await inventoryService.updateInventorySettings(req.params.id, req.body);
  res.json({ success: true, data });
}

async function adjustInventoryStock(req, res) {
  const data = await inventoryService.adjustStock(req.params.id, req.body, req.admin?.id);
  res.json({ success: true, data });
}

async function listStockMovements(req, res) {
  const data = await inventoryService.listMovements(req.query);
  res.json({ success: true, data });
}

module.exports = {
  getSettings,
  updateSettings,
  getHero,
  updateHero,
  updateHeroSideCards,
  updateHeroTopDeals,
  generateSlip,
  listSlips,
  getSlipsByOrder,
  reprintSlip,
  getSalesSummary,
  getSalesByItem,
  getSalesByCategory,
  getSalesByDay,
  getSalesCustomers,
  getSalesDailyClosing,
  getSalesCredit,
  getSalesProfit,
  listSalesPayables,
  createSalesPayable,
  settleSalesPayable,
  listRiders,
  getRider,
  createRider,
  updateRider,
  toggleRider,
  listDeliveryLocations,
  getDeliveryLocation,
  createDeliveryLocation,
  updateDeliveryLocation,
  toggleDeliveryLocation,
  deleteDeliveryLocation,
  createWalkInOrder,
  requestBill,
  updateHeroSlides,
  listMarketingDeals,
  getMarketingDeal,
  createMarketingDeal,
  updateMarketingDeal,
  removeMarketingDeal,
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  toggleStaff,
  listInventory,
  getInventorySummary,
  getInventoryItem,
  updateInventoryItem,
  adjustInventoryStock,
  listStockMovements,
};
