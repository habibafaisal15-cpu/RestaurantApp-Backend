const express = require('express');
const adminController = require('../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../middleware/authMiddleware');
const { validateBody, generateSlipSchema } = require('../../../validators/adminSchemas');

const router = express.Router();

router.use(authenticateAdmin);

router.post('/generate', validateBody(generateSlipSchema), adminController.generateSlip);
router.get('/order/:orderId', adminController.getSlipsByOrder);
router.get('/', adminController.listSlips);
router.post('/:id/reprint', adminController.reprintSlip);

module.exports = router;
