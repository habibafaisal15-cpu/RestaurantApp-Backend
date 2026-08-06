const express = require('express');
const adminController = require('../../../controllers/admin/adminController');
const { authenticateAdmin } = require('../../../middleware/authMiddleware');
const {
  validateBody,
  updateHeroSchema,
  sideCardsSchema,
  slidesSchema,
  topDealsSchema,
} = require('../../../validators/adminSchemas');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', adminController.getHero);
router.put('/', validateBody(updateHeroSchema), adminController.updateHero);
router.put('/side-cards', validateBody(sideCardsSchema), adminController.updateHeroSideCards);
router.put('/slides', validateBody(slidesSchema), adminController.updateHeroSlides);
router.put('/top-deals', validateBody(topDealsSchema), adminController.updateHeroTopDeals);

module.exports = router;
