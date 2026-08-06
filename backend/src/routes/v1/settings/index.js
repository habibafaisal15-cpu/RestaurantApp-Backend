const express = require('express');
const adminController = require('../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../middleware/authMiddleware');
const {
  validateBody,
  updateSettingsSchema,
  updateHeroSchema,
  sideCardsSchema,
  topDealsSchema,
  generateSlipSchema,
  createRiderSchema,
  updateRiderSchema,
  walkInOrderSchema,
} = require('../../../validators/adminSchemas');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', adminController.getSettings);
router.put('/', validateBody(updateSettingsSchema), adminController.updateSettings);

module.exports = router;
