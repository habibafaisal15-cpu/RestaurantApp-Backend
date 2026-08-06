const express = require('express');
const adminController = require('../../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', adminController.listMarketingDeals);
router.post('/', adminController.createMarketingDeal);
router.get('/:id', adminController.getMarketingDeal);
router.put('/:id', adminController.updateMarketingDeal);
router.delete('/:id', adminController.removeMarketingDeal);

module.exports = router;
