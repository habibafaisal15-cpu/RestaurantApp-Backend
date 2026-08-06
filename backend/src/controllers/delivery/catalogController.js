const catalogService = require('../../services/delivery/catalogService');
const { createMenuEmit, MENU_WS_EVENTS } = require('../../utils/menuEvents');

function getEmit(req) {
  return createMenuEmit(req.app.get('io'));
}

async function createCategory(req, res) {
  const category = await catalogService.createCategory(req.body);
  const emit = getEmit(req);

  emit(MENU_WS_EVENTS.UPDATED, {
    action: 'category_created',
    category,
  });

  res.status(201).json({ success: true, data: category });
}

async function updateCategory(req, res) {
  const category = await catalogService.updateCategory(req.params.id, req.body);
  const emit = getEmit(req);

  emit(MENU_WS_EVENTS.UPDATED, {
    action: 'category_updated',
    category,
  });

  res.json({ success: true, data: category });
}

async function createItem(req, res) {
  const item = await catalogService.createProduct(req.body, req.file);
  const emit = getEmit(req);

  emit(MENU_WS_EVENTS.ITEM_CREATED, { item });
  emit(MENU_WS_EVENTS.UPDATED, { action: 'item_created', item });

  res.status(201).json({ success: true, data: item });
}

async function updateItem(req, res) {
  const item = await catalogService.updateProduct(req.params.id, req.body, req.file);
  const emit = getEmit(req);

  emit(MENU_WS_EVENTS.ITEM_UPDATED, { item });
  emit(MENU_WS_EVENTS.UPDATED, { action: 'item_updated', item });

  res.json({ success: true, data: item });
}

async function deleteItem(req, res) {
  const result = await catalogService.deleteProduct(req.params.id);
  const emit = getEmit(req);

  emit(MENU_WS_EVENTS.ITEM_DELETED, result);
  emit(MENU_WS_EVENTS.UPDATED, { action: 'item_deleted', ...result });

  res.json({ success: true, data: result });
}

async function listDeals(req, res) {
  const deals = await catalogService.listDeals({
    active_only: req.query.active_only === 'true',
  });
  res.json({ success: true, data: deals });
}

async function getDeal(req, res) {
  const deal = await catalogService.getDealById(req.params.id);
  res.json({ success: true, data: deal });
}

async function createDeal(req, res) {
  const deal = await catalogService.createDeal(req.body, req.file);
  const emit = getEmit(req);

  emit(MENU_WS_EVENTS.DEAL_CREATED, { deal });
  emit(MENU_WS_EVENTS.UPDATED, { action: 'deal_created', deal });

  res.status(201).json({ success: true, data: deal });
}

async function updateDeal(req, res) {
  const deal = await catalogService.updateDeal(req.params.id, req.body, req.file);
  const emit = getEmit(req);

  emit(MENU_WS_EVENTS.DEAL_UPDATED, { deal });
  emit(MENU_WS_EVENTS.UPDATED, { action: 'deal_updated', deal });

  res.json({ success: true, data: deal });
}

async function deleteDeal(req, res) {
  const result = await catalogService.deleteDeal(req.params.id);
  const emit = getEmit(req);

  emit(MENU_WS_EVENTS.DEAL_DELETED, result);
  emit(MENU_WS_EVENTS.UPDATED, { action: 'deal_deleted', ...result });

  res.json({ success: true, data: result });
}

async function uploadMedia(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided',
    });
  }

  const folder = req.params.folder;
  const url = `/uploads/${folder}/${req.file.filename}`;

  res.status(201).json({
    success: true,
    data: { url },
  });
}

module.exports = {
  createCategory,
  updateCategory,
  createItem,
  updateItem,
  deleteItem,
  listDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  uploadMedia,
};
