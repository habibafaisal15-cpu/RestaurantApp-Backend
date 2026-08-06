const express = require('express');
const adminController = require('../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../middleware/authMiddleware');
const { validateBody, walkInOrderSchema } = require('../../../validators/adminSchemas');

const router = express.Router();

router.use(authenticateAdmin);

router.post('/walk-in', validateBody(walkInOrderSchema), adminController.createWalkInOrder);

module.exports = router;
