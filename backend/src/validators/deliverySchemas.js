const { z } = require('zod');

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const checkLocationSchema = z.object({
  pincode: z.string().optional(),
  area: z.string().optional(),
  address: z.string().optional(),
  formatted_address: z.string().optional(),
  city: z.string().optional(),
  place_id: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).refine(
  (data) =>
    data.pincode
    || data.area
    || data.address
    || data.place_id
    || (data.latitude != null && data.longitude != null),
  { message: 'Provide coordinates, place_id, pincode, area, or address' },
);

const selectLiveLocationSchema = coordinatesSchema.extend({
  address: z.string().optional(),
});

const geocodeAddressSchema = z.object({
  address: z.string().min(1),
});

const geocodePlaceSchema = z.object({
  place_id: z.string().min(1),
});

const createOrderSchema = z.object({
  zone_id: z.string().uuid(),
  customer_name: z.string().min(1).max(100),
  customer_phone: z.string().min(5).max(20),
  delivery_address: z.string().min(1),
  delivery_instructions: z.string().optional(),
  payment_method: z.enum(['COD', 'Online']),
  discount: z.number().min(0).optional().default(0),
  delivery_latitude: z.number().min(-90).max(90).optional(),
  delivery_longitude: z.number().min(-180).max(180).optional(),
  delivery_place_id: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'Accepted',
    'Rejected',
    'Sent to Kitchen',
    'Preparing',
    'Order Prepared',
    'Rider Assigned',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
  ]),
  set_by: z.string().min(1).max(100).optional(),
  note: z.string().max(255).optional(),
  actor: z.enum(['admin', 'kitchen', 'rider']).optional(),
});

const assignRiderSchema = z.object({
  rider_name: z.string().min(1).max(100),
  rider_phone: z.string().min(5).max(20),
  set_by: z.string().min(1).max(100).optional(),
});

const updateAvailabilitySchema = z
  .object({
    in_stock: z.boolean().optional(),
    available_for_delivery: z.boolean().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.in_stock !== undefined
      || data.available_for_delivery !== undefined
      || data.is_active !== undefined,
    { message: 'Provide at least one of in_stock, available_for_delivery, or is_active' },
  );

function validateBody(schema) {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

module.exports = {
  checkLocationSchema,
  selectLiveLocationSchema,
  geocodeAddressSchema,
  geocodePlaceSchema,
  coordinatesSchema,
  createOrderSchema,
  updateStatusSchema,
  assignRiderSchema,
  updateAvailabilitySchema,
  validateBody,
};
