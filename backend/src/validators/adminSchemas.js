const { z } = require('zod');

const boolish = z.preprocess((val) => {
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return val;
}, z.boolean());

const updateSettingsSchema = z
  .object({
    restaurantName: z.string().min(1).max(150).optional(),
    tagline: z.string().max(255).optional(),
    logo: z.string().max(500).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email().optional(),
    address: z.string().max(255).optional(),
    taxPercent: z.coerce.number().min(0).max(100).optional(),
    serviceChargePercent: z.coerce.number().min(0).max(100).optional(),
    deliveryFee: z.coerce.number().min(0).optional(),
    currency: z.string().max(10).optional(),
    isOpen: boolish.optional(),
    announcement: z.string().max(500).optional(),
    slipFooter: z.string().max(500).optional(),
    autoSlipWalkIn: boolish.optional(),
    autoSlipOnlineAccept: boolish.optional(),
    billWidth: z.enum(['short', 'wide']).optional(),
    showNameOnBill: boolish.optional(),
    showLogoOnBill: boolish.optional(),
    showAddressOnBill: boolish.optional(),
    showPhoneOnBill: boolish.optional(),
    openingHours: z.record(z.any()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const updateHeroSchema = z.object({
  slides: z.array(z.any()).optional(),
  sideCards: z.array(z.any()).optional(),
  topDeals: z.array(z.any()).optional(),
});

const sideCardsSchema = z.object({
  sideCards: z.array(z.any()),
});

const slidesSchema = z.object({
  slides: z.array(z.any()),
});

const topDealsSchema = z.object({
  topDeals: z.array(z.any()),
});

const generateSlipSchema = z.object({
  orderId: z.string().uuid(),
  slipType: z.enum(['kitchen', 'delivery', 'receipt']).default('kitchen'),
});

const createRiderSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(5).max(20),
  vehicleNumber: z.string().max(50).optional(),
  vehicleType: z.string().max(50).optional(),
});

const updateRiderSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().min(5).max(20).optional(),
    vehicleNumber: z.string().max(50).optional(),
    vehicleType: z.string().max(50).optional(),
    status: z.enum(['available', 'busy', 'offline']).optional(),
    active: boolish.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const createDeliveryLocationSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(255),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().min(0.5).max(50).default(10),
  is_active: boolish.optional().default(true),
  notes: z.string().max(500).optional().default(''),
  base_fee: z.coerce.number().min(0).optional(),
  estimated_time: z.string().max(50).optional(),
});

const updateDeliveryLocationSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    address: z.string().min(1).max(255).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radius_km: z.coerce.number().min(0.5).max(50).optional(),
    is_active: boolish.optional(),
    notes: z.string().max(500).optional(),
    base_fee: z.coerce.number().min(0).optional(),
    estimated_time: z.string().max(50).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const walkInItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  notes: z.string().optional(),
});

const walkInOrderSchema = z.object({
  type: z.enum(['DINE_IN', 'TAKEAWAY']).default('DINE_IN'),
  items: z.array(walkInItemSchema).min(1),
  customer: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  tableNumber: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'online']).default('cash'),
  paymentStatus: z.enum(['paid', 'pending']).default('paid'),
  discount: z.coerce.number().min(0).optional(),
  cashierName: z.string().optional(),
  notes: z.string().optional(),
});

const requestBillSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'online']).default('cash'),
  cashierName: z.string().optional(),
});

const createPayableSchema = z.object({
  supplierName: z.string().min(1).max(120),
  amount: z.coerce.number().positive(),
  paidAmount: z.coerce.number().min(0).optional(),
  reference: z.string().max(80).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const settlePayableSchema = z.object({
  paidAmount: z.coerce.number().min(0).optional(),
});

const staffRoleSchema = z.enum(['admin', 'super-admin', 'manager', 'cashier', 'store-admin', 'kitchen']);

const createStaffSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(150),
  phone: z.string().max(30).optional().nullable(),
  role: staffRoleSchema.optional().default('admin'),
  password: z.string().min(6).max(100),
  active: boolish.optional(),
  is_active: boolish.optional(),
}).refine((data) => Boolean(data.full_name || data.name), {
  message: 'Name is required',
});

const updateStaffSchema = z
  .object({
    full_name: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().max(150).optional(),
    phone: z.string().max(30).optional().nullable(),
    role: staffRoleSchema.optional(),
    password: z.string().min(6).max(100).optional(),
    active: boolish.optional(),
    is_active: boolish.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const adjustStockSchema = z.object({
  type: z.enum(['in', 'out', 'adjust', 'sale', 'return']).default('adjust'),
  quantity: z.coerce.number(),
  reason: z.string().max(255).optional().nullable(),
  trackStock: boolish.optional(),
  enableTracking: boolish.optional(),
  referenceType: z.string().max(40).optional().nullable(),
  referenceId: z.string().max(36).optional().nullable(),
});

const updateInventorySettingsSchema = z
  .object({
    trackStock: boolish.optional(),
    track_stock: boolish.optional(),
    lowStockThreshold: z.coerce.number().min(0).optional(),
    low_stock_threshold: z.coerce.number().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

function validateBody(schema) {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

module.exports = {
  updateSettingsSchema,
  updateHeroSchema,
  sideCardsSchema,
  slidesSchema,
  topDealsSchema,
  generateSlipSchema,
  createRiderSchema,
  updateRiderSchema,
  createDeliveryLocationSchema,
  updateDeliveryLocationSchema,
  walkInOrderSchema,
  requestBillSchema,
  createPayableSchema,
  settlePayableSchema,
  createStaffSchema,
  updateStaffSchema,
  adjustStockSchema,
  updateInventorySettingsSchema,
  validateBody,
};
