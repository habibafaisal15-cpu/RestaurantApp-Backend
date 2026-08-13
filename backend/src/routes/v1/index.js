const express = require('express');
const storefrontRoutes = require('./storefront');
const deliveryRoutes = require('./delivery');
const trackRoutes = require('./track');
const authRoutes = require('./auth');
const settingsRoutes = require('./settings');
const heroRoutes = require('./hero');
const slipsRoutes = require('./slips');
const salesRoutes = require('./sales');
const ordersRoutes = require('./orders');
const adminDealsRoutes = require('./admin/deals');
const adminStaffRoutes = require('./admin/staff');
const cronRoutes = require('./cron');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/storefront', storefrontRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/track', trackRoutes);
router.use('/settings', settingsRoutes);
router.use('/hero', heroRoutes);
router.use('/slips', slipsRoutes);
router.use('/sales', salesRoutes);
router.use('/orders', ordersRoutes);
router.use('/admin/deals', adminDealsRoutes);
router.use('/admin/staff', adminStaffRoutes);
router.use('/cron', cronRoutes);
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API is running' });
});

module.exports = router;
