const express = require('express');
const adminController = require('../../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../../middleware/authMiddleware');
const {
  validateBody,
  adjustStockSchema,
  updateInventorySettingsSchema,
} = require('../../../../validators/adminSchemas');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', adminController.listInventory);
router.get('/summary', adminController.getInventorySummary);
router.get('/movements', adminController.listStockMovements);
router.get('/:id', adminController.getInventoryItem);
router.patch('/:id', validateBody(updateInventorySettingsSchema), adminController.updateInventoryItem);
router.post('/:id/adjust', validateBody(adjustStockSchema), adminController.adjustInventoryStock);

module.exports = router;
