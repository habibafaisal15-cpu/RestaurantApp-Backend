const menuService = require('../../services/delivery/menuService');
const { createMenuEmit, MENU_WS_EVENTS } = require('../../utils/menuEvents');

async function listItems(req, res) {
  const items = await menuService.listMenuItems({
    category_id: req.query.category_id,
    availability: req.query.availability,
  });
  res.json({ success: true, data: items });
}

async function getItem(req, res) {
  const item = await menuService.getMenuItemById(req.params.id);
  res.json({ success: true, data: item });
}

async function updateAvailability(req, res) {
  const item = await menuService.updateItemAvailability(req.params.id, req.body);
  const emit = createMenuEmit(req.app.get('io'));

  emit(MENU_WS_EVENTS.ITEM_UPDATED, { item });
  emit(MENU_WS_EVENTS.UPDATED, { action: 'item_updated', item });

  res.json({ success: true, data: item });
}

async function listCategories(_req, res) {
  const categories = await menuService.listCategories();
  res.json({ success: true, data: categories });
}

module.exports = {
  listItems,
  getItem,
  updateAvailability,
  listCategories,
};
