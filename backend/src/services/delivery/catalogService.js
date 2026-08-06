const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../errors/AppError');
const { UPLOAD_ROOT } = require('../../config/upload');
const { parseProductIds } = require('../../utils/menuBuilder');
const menuService = require('./menuService');

function imagePathFromFile(folder, file) {
  return `/uploads/${folder}/${file.filename}`;
}

function deleteLocalImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;

  const relative = imageUrl.replace(/^\/uploads\//, '');
  const full = path.join(UPLOAD_ROOT, relative);
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

async function ensureCategoryExists(categoryId) {
  const category = await db('menu_categories').where({ id: categoryId }).first();
  if (!category) throw new BadRequestError('Invalid category_id');
  return category;
}

async function createCategory(payload) {
  const id = uuidv4();
  await db('menu_categories').insert({
    id,
    category_name: payload.category_name,
    display_order: payload.display_order ?? 0,
    is_active: payload.is_active ?? true,
    description: payload.description ?? null,
    image_url: payload.image_url ?? null,
    hero_image_url: payload.hero_image_url ?? null,
    hero_title: payload.hero_title ?? null,
    show_in_hero: payload.show_in_hero ?? false,
  });

  return db('menu_categories').where({ id }).first();
}

async function updateCategory(id, payload) {
  const existing = await db('menu_categories').where({ id }).first();
  if (!existing) throw new NotFoundError('Category not found');

  const updates = {};
  if (payload.category_name !== undefined) updates.category_name = payload.category_name;
  if (payload.display_order !== undefined) updates.display_order = payload.display_order;
  if (payload.is_active !== undefined) updates.is_active = payload.is_active;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.image_url !== undefined) updates.image_url = payload.image_url;
  if (payload.hero_image_url !== undefined) updates.hero_image_url = payload.hero_image_url;
  if (payload.hero_title !== undefined) updates.hero_title = payload.hero_title;
  if (payload.show_in_hero !== undefined) updates.show_in_hero = payload.show_in_hero;

  if (Object.keys(updates).length === 0) return existing;

  updates.updated_at = db.fn.now();

  await db('menu_categories').where({ id }).update(updates);
  return db('menu_categories').where({ id }).first();
}

async function createProduct(payload, file) {
  await ensureCategoryExists(payload.category_id);

  const id = uuidv4();
  const imageUrl = file
    ? imagePathFromFile('products', file)
    : payload.image_url || null;

  await db('products').insert({
    id,
    category_id: payload.category_id,
    name: payload.name,
    description: payload.description || null,
    image_url: imageUrl,
    price: payload.price,
    available_for_delivery: payload.available_for_delivery ?? true,
    in_stock: payload.in_stock ?? true,
    is_active: payload.is_active ?? true,
  });

  return menuService.getMenuItemById(id);
}

async function updateProduct(id, payload, file) {
  const existing = await db('products').where({ id }).first();
  if (!existing) throw new NotFoundError('Menu item not found');

  if (payload.category_id) {
    await ensureCategoryExists(payload.category_id);
  }

  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.category_id !== undefined) updates.category_id = payload.category_id;
  if (payload.price !== undefined) updates.price = payload.price;
  if (payload.available_for_delivery !== undefined) {
    updates.available_for_delivery = payload.available_for_delivery;
  }
  if (payload.in_stock !== undefined) updates.in_stock = payload.in_stock;
  if (payload.is_active !== undefined) updates.is_active = payload.is_active;

  if (file) {
    deleteLocalImage(existing.image_url);
    updates.image_url = imagePathFromFile('products', file);
  } else if (payload.image_url !== undefined) {
    if (payload.image_url !== existing.image_url) {
      deleteLocalImage(existing.image_url);
    }
    updates.image_url = payload.image_url || null;
  }

  if (Object.keys(updates).length > 0) {
    await db('products').where({ id }).update(updates);
  }

  return menuService.getMenuItemById(id);
}

async function deleteProduct(id) {
  const existing = await db('products').where({ id }).first();
  if (!existing) throw new NotFoundError('Menu item not found');

  deleteLocalImage(existing.image_url);
  await db('products').where({ id }).del();
  return { id, deleted: true };
}

function formatDeal(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
    product_ids: parseProductIds(row.product_ids),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
  };
}

async function listDeals(filters = {}) {
  let query = db('deals').orderBy('created_at', 'desc');

  if (filters.active_only) {
    const now = new Date();
    query = query
      .where({ is_active: true })
      .where((builder) => {
        builder.whereNull('starts_at').orWhere('starts_at', '<=', now);
      })
      .where((builder) => {
        builder.whereNull('ends_at').orWhere('ends_at', '>=', now);
      });
  }

  const rows = await query;
  return rows.map(formatDeal);
}

async function getDealById(id) {
  const row = await db('deals').where({ id }).first();
  if (!row) throw new NotFoundError('Deal not found');
  return formatDeal(row);
}

async function validateDealProducts(productIds) {
  if (!productIds || productIds.length === 0) return;

  const rows = await db('products').whereIn('id', productIds).select('id');
  if (rows.length !== productIds.length) {
    throw new BadRequestError('One or more product_ids are invalid');
  }
}

async function createDeal(payload, file) {
  const productIds = parseProductIds(payload.product_ids);
  await validateDealProducts(productIds);

  const id = uuidv4();
  const imageUrl = file
    ? imagePathFromFile('deals', file)
    : payload.image_url || null;

  await db('deals').insert({
    id,
    title: payload.title,
    description: payload.description || null,
    image_url: imageUrl,
    discount_type: payload.discount_type,
    discount_value: payload.discount_value,
    product_ids: productIds ? JSON.stringify(productIds) : null,
    starts_at: payload.starts_at || null,
    ends_at: payload.ends_at || null,
    is_active: payload.is_active ?? true,
  });

  return getDealById(id);
}

async function updateDeal(id, payload, file) {
  const existing = await db('deals').where({ id }).first();
  if (!existing) throw new NotFoundError('Deal not found');

  if (payload.product_ids !== undefined) {
    const productIds = parseProductIds(payload.product_ids);
    await validateDealProducts(productIds);
  }

  const updates = {};
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.discount_type !== undefined) updates.discount_type = payload.discount_type;
  if (payload.discount_value !== undefined) updates.discount_value = payload.discount_value;
  if (payload.starts_at !== undefined) updates.starts_at = payload.starts_at;
  if (payload.ends_at !== undefined) updates.ends_at = payload.ends_at;
  if (payload.is_active !== undefined) updates.is_active = payload.is_active;

  if (payload.product_ids !== undefined) {
    const productIds = parseProductIds(payload.product_ids);
    updates.product_ids = productIds ? JSON.stringify(productIds) : null;
  }

  if (file) {
    deleteLocalImage(existing.image_url);
    updates.image_url = imagePathFromFile('deals', file);
  } else if (payload.image_url !== undefined) {
    if (payload.image_url !== existing.image_url) {
      deleteLocalImage(existing.image_url);
    }
    updates.image_url = payload.image_url || null;
  }

  if (Object.keys(updates).length > 0) {
    await db('deals').where({ id }).update(updates);
  }

  return getDealById(id);
}

async function deleteDeal(id) {
  const existing = await db('deals').where({ id }).first();
  if (!existing) throw new NotFoundError('Deal not found');

  deleteLocalImage(existing.image_url);
  await db('deals').where({ id }).del();
  return { id, deleted: true };
}

module.exports = {
  createCategory,
  updateCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  listDeals,
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal,
};
