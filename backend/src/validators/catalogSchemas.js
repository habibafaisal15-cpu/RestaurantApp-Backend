const { z } = require('zod');

const boolish = z.preprocess((val) => {
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return val;
}, z.boolean());

const optionalUrl = z.preprocess(
  (val) => (val === '' || val === 'null' ? undefined : val),
  z
    .union([
      z.string().url(),
      z.string().regex(/^\/uploads\//),
    ])
    .optional(),
);

const productIdsField = z.preprocess((val) => {
  if (val == null || val === '' || val === 'null') return null;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val.split(',').map((id) => id.trim()).filter(Boolean);
    }
  }
  return val;
}, z.array(z.string().uuid()).nullable().optional());

const tagsField = z.preprocess((val) => {
  if (val == null || val === '' || val === 'null') return undefined;
  if (Array.isArray(val)) return val.map((t) => String(t).trim()).filter(Boolean);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim()).filter(Boolean);
      }
    } catch {
      return val.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return undefined;
}, z.array(z.string().min(1).max(40)).max(20).optional());

const createCategorySchema = z.object({
  category_name: z.string().min(1).max(100),
  display_order: z.coerce.number().int().optional(),
  is_active: boolish.optional(),
  description: z.string().optional(),
  image_url: optionalUrl,
  hero_image_url: optionalUrl,
  hero_title: z.string().max(150).optional(),
  show_in_hero: boolish.optional(),
});

const updateCategorySchema = z
  .object({
    category_name: z.string().min(1).max(100).optional(),
    display_order: z.coerce.number().int().optional(),
    is_active: boolish.optional(),
    description: z.string().optional(),
    image_url: optionalUrl.nullable(),
    hero_image_url: optionalUrl.nullable(),
    hero_title: z.string().max(150).optional(),
    show_in_hero: boolish.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category_id: z.string().uuid(),
  price: z.coerce.number().positive(),
  image_url: optionalUrl,
  available_for_delivery: boolish.optional(),
  in_stock: boolish.optional(),
  is_active: boolish.optional(),
  tags: tagsField,
});

const updateProductSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    category_id: z.string().uuid().optional(),
    price: z.coerce.number().positive().optional(),
    image_url: optionalUrl.nullable(),
    available_for_delivery: boolish.optional(),
    in_stock: boolish.optional(),
    is_active: boolish.optional(),
    tags: tagsField,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const createDealSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().optional(),
  image_url: optionalUrl,
  discount_type: z.enum(['percentage', 'fixed']).default('percentage'),
  discount_value: z.coerce.number().positive(),
  product_ids: productIdsField,
  starts_at: z.coerce.date().optional().nullable(),
  ends_at: z.coerce.date().optional().nullable(),
  is_active: boolish.optional(),
});

const updateDealSchema = z
  .object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().optional(),
    image_url: optionalUrl.nullable(),
    discount_type: z.enum(['percentage', 'fixed']).optional(),
    discount_value: z.coerce.number().positive().optional(),
    product_ids: productIdsField,
    starts_at: z.coerce.date().optional().nullable(),
    ends_at: z.coerce.date().optional().nullable(),
    is_active: boolish.optional(),
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
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createDealSchema,
  updateDealSchema,
  validateBody,
};
