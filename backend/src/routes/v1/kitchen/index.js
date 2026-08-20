const express = require('express');
const deliveryService = require('../../../services/delivery/deliveryService');
const { authenticateKitchen, authenticateRider } = require('../../../middleware/authMiddleware');
const { validateBody, updateStatusSchema } = require('../../../validators/deliverySchemas');
const { createCustomerEmit } = require('../../../utils/customerEvents');

const router = express.Router();

router.get('/orders', authenticateKitchen, async (req, res, next) => {
  try {
    const data = await deliveryService.listKitchenOrders({
      board: req.query.board || req.query.status,
      limit: req.query.limit,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:id', authenticateKitchen, async (req, res, next) => {
  try {
    const data = await deliveryService.getOrderById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/orders/:id/status',
  authenticateKitchen,
  validateBody(updateStatusSchema),
  async (req, res, next) => {
    try {
      const emit = createCustomerEmit(req.app.get('io'));
      const data = await deliveryService.updateOrderStatus(
        req.params.id,
        {
          ...req.body,
          set_by: req.body.set_by || req.admin?.full_name || 'Kitchen',
        },
        emit,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/rider/orders', authenticateRider, async (req, res, next) => {
  try {
    const data = await deliveryService.listRiderOrders(req.rider.phone, {
      status: req.query.status || 'active',
      limit: req.query.limit,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/rider/orders/:id/status',
  authenticateRider,
  validateBody(updateStatusSchema),
  async (req, res, next) => {
    try {
      const emit = createCustomerEmit(req.app.get('io'));
      const data = await deliveryService.updateOrderStatus(
        req.params.id,
        {
          ...req.body,
          set_by: req.body.set_by || req.rider?.name || 'Rider',
        },
        emit,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
