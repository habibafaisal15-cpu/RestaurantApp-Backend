const settingsService = require('../../services/admin/settingsService');
const heroService = require('../../services/admin/heroService');
const slipService = require('../../services/admin/slipService');
const salesService = require('../../services/admin/salesService');
const riderService = require('../../services/admin/riderService');
const posOrderService = require('../../services/admin/posOrderService');
const marketingDealService = require('../../services/admin/marketingDealService');

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
  res.status(201).json({ success: true, data });
}

async function updateMarketingDeal(req, res) {
  const data = await marketingDealService.updateDeal(req.params.id, req.body);
  res.json({ success: true, data });
}

async function removeMarketingDeal(req, res) {
  const data = await marketingDealService.removeDeal(req.params.id);
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
  listRiders,
  getRider,
  createRider,
  updateRider,
  toggleRider,
  createWalkInOrder,
  updateHeroSlides,
  listMarketingDeals,
  getMarketingDeal,
  createMarketingDeal,
  updateMarketingDeal,
  removeMarketingDeal,
};
