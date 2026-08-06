const db = require('../../config/database');
const { NotFoundError } = require('../../errors/AppError');

function formatProduct(row, categoryName) {
  const inStock = Boolean(row.in_stock);
  const availableForDelivery = Boolean(row.available_for_delivery);
  const isActive = Boolean(row.is_active);

  let availability_status = 'available';
  if (!isActive || !availableForDelivery) {
    availability_status = 'unavailable';
  } else if (!inStock) {
    availability_status = 'out_of_stock';
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    image_url: row.image_url,
    price: Number(row.price),
    category_id: row.category_id,
    category_name: categoryName,
    in_stock: inStock,
    available_for_delivery: availableForDelivery,
    is_active: isActive,
    availability_status,
  };
}

async function listMenuItems(filters = {}) {
  let query = db('products')
    .join('menu_categories', 'products.category_id', 'menu_categories.id')
    .select(
      'products.*',
      'menu_categories.category_name',
      'menu_categories.display_order',
    )
    .orderBy('menu_categories.display_order', 'asc')
    .orderBy('products.name', 'asc');

  if (filters.category_id) {
    query = query.where('products.category_id', filters.category_id);
  }

  if (filters.availability === 'available') {
    query = query.where({
      'products.is_active': true,
      'products.available_for_delivery': true,
      'products.in_stock': true,
    });
  } else if (filters.availability === 'unavailable') {
    query = query.where((builder) => {
      builder
        .where('products.is_active', false)
        .orWhere('products.available_for_delivery', false);
    });
  } else if (filters.availability === 'out_of_stock') {
    query = query
      .where('products.in_stock', false)
      .where('products.is_active', true)
      .where('products.available_for_delivery', true);
  }

  const rows = await query;
  return rows.map((row) => formatProduct(row, row.category_name));
}

async function getMenuItemById(id) {
  const row = await db('products')
    .join('menu_categories', 'products.category_id', 'menu_categories.id')
    .select('products.*', 'menu_categories.category_name')
    .where('products.id', id)
    .first();

  if (!row) throw new NotFoundError('Menu item not found');
  return formatProduct(row, row.category_name);
}

async function updateItemAvailability(id, payload) {
  const existing = await db('products').where({ id }).first();
  if (!existing) throw new NotFoundError('Menu item not found');

  const updates = {};

  if (payload.in_stock !== undefined) {
    updates.in_stock = payload.in_stock;
  }

  if (payload.available_for_delivery !== undefined) {
    updates.available_for_delivery = payload.available_for_delivery;
  }

  if (payload.is_active !== undefined) {
    updates.is_active = payload.is_active;
  }

  if (Object.keys(updates).length === 0) {
    return getMenuItemById(id);
  }

  await db('products').where({ id }).update(updates);
  return getMenuItemById(id);
}

async function listCategories() {
  const categories = await db('menu_categories')
    .orderBy('display_order', 'asc')
    .select('*');

  const counts = await db('products')
    .where({ is_active: true })
    .select('category_id')
    .count('id as item_count')
    .groupBy('category_id');

  const countMap = Object.fromEntries(
    counts.map((row) => [row.category_id, Number(row.item_count)]),
  );

  return categories.map((cat) => ({
    ...cat,
    item_count: countMap[cat.id] || 0,
  }));
}

module.exports = {
  listMenuItems,
  getMenuItemById,
  updateItemAvailability,
  listCategories,
};
