const express = require('express');
const adminController = require('../../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../../middleware/authMiddleware');
const {
  validateBody,
  createStaffSchema,
  updateStaffSchema,
} = require('../../../../validators/adminSchemas');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', adminController.listStaff);
router.post('/', validateBody(createStaffSchema), adminController.createStaff);
router.get('/:id', adminController.getStaff);
router.patch('/:id', validateBody(updateStaffSchema), adminController.updateStaff);
router.patch('/:id/toggle-active', adminController.toggleStaff);

module.exports = router;
