const express = require('express');
const authController = require('../../../controllers/auth/authController');
const { authenticateAdmin } = require('../../../middleware/authMiddleware');
const {
  validateBody,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../../../validators/authSchemas');

const router = express.Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticateAdmin, authController.me);
router.post('/change-password', authenticateAdmin, validateBody(changePasswordSchema), authController.changePassword);

module.exports = router;
