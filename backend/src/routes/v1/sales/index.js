const express = require('express');
const adminController = require('../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../middleware/authMiddleware');
const { validateBody, createPayableSchema, settlePayableSchema } = require('../../../validators/adminSchemas');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/summary', adminController.getSalesSummary);
router.get('/by-item', adminController.getSalesByItem);
router.get('/by-category', adminController.getSalesByCategory);
router.get('/by-day', adminController.getSalesByDay);
router.get('/customers', adminController.getSalesCustomers);
router.get('/daily-closing', adminController.getSalesDailyClosing);
router.get('/credit', adminController.getSalesCredit);
router.get('/profit', adminController.getSalesProfit);
router.get('/payables', adminController.listSalesPayables);
router.post('/payables', validateBody(createPayableSchema), adminController.createSalesPayable);
router.post(
  '/payables/:id/settle',
  validateBody(settlePayableSchema),
  adminController.settleSalesPayable,
);

module.exports = router;
