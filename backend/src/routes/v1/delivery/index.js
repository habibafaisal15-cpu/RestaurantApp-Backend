const express = require('express');
const deliveryController = require('../../../controllers/delivery/deliveryController');
const adminController = require('../../../controllers/admin/adminController');
const menuController = require('../../../controllers/delivery/menuController');
const catalogController = require('../../../controllers/delivery/catalogController');
const { authenticateAdmin } = require('../../../middleware/authMiddleware');
const { uploadProductImage, uploadDealImage, uploadMediaImage } = require('../../../middleware/upload');
const {
  validateBody,
  updateStatusSchema,
  assignRiderSchema,
  updateAvailabilitySchema,
} = require('../../../validators/deliverySchemas');
const {
  validateBody: validateCatalogBody,
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createDealSchema,
  updateDealSchema,
} = require('../../../validators/catalogSchemas');
const {
  validateBody: validateAdminBody,
  createRiderSchema,
  updateRiderSchema,
  createDeliveryLocationSchema,
  updateDeliveryLocationSchema,
} = require('../../../validators/adminSchemas');

const router = express.Router();

router.use(authenticateAdmin);

router.post('/media/:folder', (req, res, next) => {
  try {
    uploadMediaImage(req.params.folder)(req, res, (err) => {
      if (err) return next(err);
      return catalogController.uploadMedia(req, res);
    });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', deliveryController.getDashboard);
router.get('/summary', deliveryController.getSummary);
router.get('/menu/categories', menuController.listCategories);
router.post(
  '/menu/categories',
  validateCatalogBody(createCategorySchema),
  catalogController.createCategory,
);
router.patch(
  '/menu/categories/:id',
  validateCatalogBody(updateCategorySchema),
  catalogController.updateCategory,
);
router.get('/menu/items', menuController.listItems);
router.post(
  '/menu/items',
  uploadProductImage,
  validateCatalogBody(createProductSchema),
  catalogController.createItem,
);
router.get('/menu/items/:id', menuController.getItem);
router.patch(
  '/menu/items/:id',
  uploadProductImage,
  validateCatalogBody(updateProductSchema),
  catalogController.updateItem,
);
router.delete('/menu/items/:id', catalogController.deleteItem);
router.patch(
  '/menu/items/:id/availability',
  validateBody(updateAvailabilitySchema),
  menuController.updateAvailability,
);
router.get('/deals', catalogController.listDeals);
router.post(
  '/deals',
  uploadDealImage,
  validateCatalogBody(createDealSchema),
  catalogController.createDeal,
);
router.get('/deals/:id', catalogController.getDeal);
router.patch(
  '/deals/:id',
  uploadDealImage,
  validateCatalogBody(updateDealSchema),
  catalogController.updateDeal,
);
router.delete('/deals/:id', catalogController.deleteDeal);
router.get('/orders', deliveryController.listOrders);
router.get('/orders/:id/tracking', deliveryController.getTracking);
router.get('/orders/:id', deliveryController.getOrder);
router.patch(
  '/orders/:id/status',
  validateBody(updateStatusSchema),
  deliveryController.updateStatus,
);
router.patch(
  '/orders/:id/assign-rider',
  validateBody(assignRiderSchema),
  deliveryController.assignRider,
);
router.get('/riders', adminController.listRiders);
router.get('/riders/:id', adminController.getRider);
router.post('/riders', validateAdminBody(createRiderSchema), adminController.createRider);
router.patch('/riders/:id', validateAdminBody(updateRiderSchema), adminController.updateRider);
router.patch('/riders/:id/toggle-active', adminController.toggleRider);

router.get('/locations', adminController.listDeliveryLocations);
router.get('/locations/:id', adminController.getDeliveryLocation);
router.post(
  '/locations',
  validateAdminBody(createDeliveryLocationSchema),
  adminController.createDeliveryLocation,
);
router.patch(
  '/locations/:id',
  validateAdminBody(updateDeliveryLocationSchema),
  adminController.updateDeliveryLocation,
);
router.patch('/locations/:id/toggle-active', adminController.toggleDeliveryLocation);
router.delete('/locations/:id', adminController.deleteDeliveryLocation);

module.exports = router;
