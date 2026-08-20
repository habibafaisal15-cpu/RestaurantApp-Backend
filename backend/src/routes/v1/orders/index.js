const express = require('express');
const adminController = require('../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../middleware/authMiddleware');
const {
  validateBody,
  walkInOrderSchema,
  requestBillSchema,
} = require('../../../validators/adminSchemas');

const router = express.Router();

router.use(authenticateAdmin);

router.post('/walk-in', validateBody(walkInOrderSchema), adminController.createWalkInOrder);
router.post(
  '/:id/request-bill',
  validateBody(requestBillSchema),
  adminController.requestBill,
);

module.exports = router;
