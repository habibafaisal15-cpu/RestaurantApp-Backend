const express = require('express');
const adminController = require('../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/summary', adminController.getSalesSummary);
router.get('/by-item', adminController.getSalesByItem);
router.get('/by-category', adminController.getSalesByCategory);
router.get('/by-day', adminController.getSalesByDay);

module.exports = router;
