const db = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../errors/AppError');
const { generateId } = require('../../utils/helpers');

const MOVEMENT_TYPES = ['in', 'out', 'adjust', 'sale', 'return'];

let inventoryColumnsReady = null;
let schemaEnsurePromise = null;

async function hasInventoryColumns() {
  if (inventoryColumnsReady == null) {
    inventoryColumnsReady = await db.schema.hasColumn('products', 'stock_qty');
  }
  return inventoryColumnsReady;
}

async function ensureInventorySchema() {
  if (schemaEnsurePromise) return schemaEnsurePromise;

  schemaEnsurePromise = (async () => {
    const hasStockQty = await db.schema.hasColumn('products', 'stock_qty');
    if (!hasStockQty) {
      await db.schema.alterTable('products', (table) => {
        table.integer('stock_qty').notNullable().defaultTo(0);
        table.integer('low_stock_threshold').notNullable().defaultTo(5);
        table.boolean('track_stock').notNullable().defaultTo(false);
      });
    } else {
      if (!(await db.schema.hasColumn('products', 'low_stock_threshold'))) {
        await db.schema.alterTable('products', (table) => {
          table.integer('low_stock_threshold').notNullable().defaultTo(5);
        });
      }
      if (!(await db.schema.hasColumn('products', 'track_stock'))) {
        await db.schema.alterTable('products', (table) => {
          table.boolean('track_stock').notNullable().defaultTo(false);
        });
      }
    }

    const hasMovements = await db.schema.hasTable('stock_movements');
    if (!hasMovements) {
      await db.schema.createTable('stock_movements', (table) => {
        table.string('id', 36).primary();
        table
          .string('product_id', 36)
          .notNullable()
          .references('id')
          .inTable('products')
          .onDelete('CASCADE');
        table.string('type', 20).notNullable();
        table.integer('quantity').notNullable();
        table.integer('quantity_before').notNullable().defaultTo(0);
        table.integer('quantity_after').notNullable().defaultTo(0);
        table.string('reason', 255).nullable();
        table.string('reference_type', 40).nullable();
        table.string('reference_id', 36).nullable();
        table.string('created_by', 36).nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index(['product_id', 'created_at']);
      });
    }

    inventoryColumnsReady = true;
  })().catch((err) => {
    schemaEnsurePromise = null;
    console.error('Failed to ensure inventory schema:', err.message);
    throw err;
  });

  return schemaEnsurePromise;
}

function stockStatus(row) {
  const track = Boolean(row.track_stock);
  const qty = Number(row.stock_qty) || 0;
  const threshold = Number(row.low_stock_threshold) || 0;
  const inStock = Boolean(row.in_stock);

  if (!track) {
    return inStock ? 'available' : 'out_of_stock';
  }
  if (qty <= 0) return 'out_of_stock';
  if (qty <= threshold) return 'low_stock';
  return 'in_stock';
}

function formatInventoryItem(row) {
  const qty = Number(row.stock_qty) || 0;
  const threshold = Number(row.low_stock_threshold) || 0;
  const track = Boolean(row.track_stock);

  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    image: row.image_url || null,
    price: Number(row.price) || 0,
    active: row.is_active !== false,
    inStock: Boolean(row.in_stock),
    trackStock: track,
    stockQty: qty,
    lowStockThreshold: threshold,
    stockStatus: stockStatus(row),
    updatedAt: row.updated_at,
  };
}

function formatMovement(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name || row.name || null,
    type: row.type,
    quantity: Number(row.quantity) || 0,
    quantityBefore: Number(row.quantity_before) || 0,
    quantityAfter: Number(row.quantity_after) || 0,
    reason: row.reason || null,
    referenceType: row.reference_type || null,
    referenceId: row.reference_id || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
  };
}

async function listInventory(filters = {}) {
  try {
    await ensureInventorySchema();
  } catch {
    // Still list products even if stock columns cannot be created yet.
  }

  const stockReady = await hasInventoryColumns();
  const selectCols = [
    'products.id',
    'products.name',
    'products.category_id',
    'products.image_url',
    'products.price',
    'products.is_active',
    'products.in_stock',
    'products.updated_at',
    'menu_categories.category_name',
  ];
  if (stockReady) {
    selectCols.push(
      'products.stock_qty',
      'products.low_stock_threshold',
      'products.track_stock',
    );
  }

  let query = db('products')
    .leftJoin('menu_categories', 'products.category_id', 'menu_categories.id')
    .select(selectCols)
    .orderBy('products.name', 'asc');

  if (filters.category_id || filters.categoryId) {
    query = query.where('products.category_id', filters.category_id || filters.categoryId);
  }

  if (stockReady) {
    if (filters.track_stock === true || filters.track_stock === 'true') {
      query = query.where('products.track_stock', true);
    } else if (filters.track_stock === false || filters.track_stock === 'false') {
      query = query.where('products.track_stock', false);
    }
  }

  if (filters.active === true || filters.active === 'true') {
    query = query.where('products.is_active', true);
  } else if (filters.active === false || filters.active === 'false') {
    query = query.where('products.is_active', false);
  }

  if (filters.search) {
    const term = `%${String(filters.search).trim().toLowerCase()}%`;
    query = query.andWhere((builder) => {
      builder
        .whereRaw('LOWER(products.name) LIKE ?', [term])
        .orWhereRaw('LOWER(COALESCE(menu_categories.category_name, \'\')) LIKE ?', [term]);
    });
  }

  const rows = await query;
  let list = rows.map(formatInventoryItem);

  if (filters.status === 'low_stock') {
    list = list.filter((item) => item.stockStatus === 'low_stock');
  } else if (filters.status === 'out_of_stock') {
    list = list.filter((item) => item.stockStatus === 'out_of_stock');
  } else if (filters.status === 'in_stock') {
    list = list.filter((item) => item.stockStatus === 'in_stock' || item.stockStatus === 'available');
  }

  return list;
}

async function getInventorySummary() {
  const items = await listInventory();
  const tracked = items.filter((item) => item.trackStock);
  return {
    totalItems: items.length,
    trackedItems: tracked.length,
    inStock: tracked.filter((item) => item.stockStatus === 'in_stock').length,
    lowStock: tracked.filter((item) => item.stockStatus === 'low_stock').length,
    outOfStock: items.filter((item) => item.stockStatus === 'out_of_stock').length,
    totalUnits: tracked.reduce((sum, item) => sum + item.stockQty, 0),
  };
}

async function getInventoryItem(id) {
  try {
    await ensureInventorySchema();
  } catch {
    // continue with whatever columns exist
  }

  const row = await db('products')
    .leftJoin('menu_categories', 'products.category_id', 'menu_categories.id')
    .select(
      'products.*',
      'menu_categories.category_name',
    )
    .where('products.id', id)
    .first();

  if (!row) throw new NotFoundError('Product not found');
  return formatInventoryItem(row);
}

async function syncInStockFlag(trx, productId, stockQty, trackStock) {
  if (!trackStock) return;
  await trx('products')
    .where({ id: productId })
    .update({
      in_stock: Number(stockQty) > 0,
      updated_at: db.fn.now(),
    });
}

async function writeMovement(trx, payload) {
  const id = generateId();
  await trx('stock_movements').insert({
    id,
    product_id: payload.productId,
    type: payload.type,
    quantity: payload.quantity,
    quantity_before: payload.quantityBefore,
    quantity_after: payload.quantityAfter,
    reason: payload.reason || null,
    reference_type: payload.referenceType || null,
    reference_id: payload.referenceId || null,
    created_by: payload.createdBy || null,
  });
  return id;
}

async function updateInventorySettings(id, payload) {
  await ensureInventorySchema();
  if (!(await hasInventoryColumns())) {
    throw new BadRequestError('Inventory columns are not migrated yet');
  }

  const existing = await db('products').where({ id }).first();
  if (!existing) throw new NotFoundError('Product not found');

  const updates = {};
  if (payload.trackStock !== undefined || payload.track_stock !== undefined) {
    updates.track_stock =
      payload.trackStock !== undefined ? Boolean(payload.trackStock) : Boolean(payload.track_stock);
  }
  if (payload.lowStockThreshold !== undefined || payload.low_stock_threshold !== undefined) {
    const threshold = Number(
      payload.lowStockThreshold !== undefined
        ? payload.lowStockThreshold
        : payload.low_stock_threshold,
    );
    if (!Number.isFinite(threshold) || threshold < 0) {
      throw new BadRequestError('Low stock threshold must be 0 or greater');
    }
    updates.low_stock_threshold = Math.floor(threshold);
  }

  if (!Object.keys(updates).length) {
    throw new BadRequestError('Provide at least one field to update');
  }

  updates.updated_at = db.fn.now();

  await db.transaction(async (trx) => {
    await trx('products').where({ id }).update(updates);
    const nextTrack =
      updates.track_stock !== undefined ? updates.track_stock : Boolean(existing.track_stock);
    const qty = Number(existing.stock_qty) || 0;
    await syncInStockFlag(trx, id, qty, nextTrack);
  });

  return getInventoryItem(id);
}

async function adjustStock(id, payload, actorId = null) {
  await ensureInventorySchema();
  if (!(await hasInventoryColumns())) {
    throw new BadRequestError('Inventory columns are not migrated yet');
  }

  const type = String(payload.type || 'adjust').toLowerCase();
  if (!MOVEMENT_TYPES.includes(type)) {
    throw new BadRequestError('Invalid stock movement type');
  }

  const quantity = Number(payload.quantity);
  if (!Number.isFinite(quantity) || quantity === 0) {
    throw new BadRequestError('Quantity must be a non-zero number');
  }

  return db.transaction(async (trx) => {
    const existing = await trx('products').where({ id }).forUpdate().first();
    if (!existing) throw new NotFoundError('Product not found');

    const before = Number(existing.stock_qty) || 0;
    let after = before;
    let delta = Math.floor(Math.abs(quantity));

    if (type === 'adjust') {
      after = Math.floor(quantity);
      if (after < 0) throw new BadRequestError('Stock cannot be negative');
      delta = after - before;
    } else if (type === 'in' || type === 'return') {
      after = before + delta;
    } else if (type === 'out' || type === 'sale') {
      after = before - delta;
      if (after < 0) {
        throw new BadRequestError(`Insufficient stock for ${existing.name}`);
      }
    }

    const trackStock =
      payload.trackStock !== undefined
        ? Boolean(payload.trackStock)
        : payload.enableTracking === false
          ? Boolean(existing.track_stock)
          : true;

    await trx('products')
      .where({ id })
      .update({
        stock_qty: after,
        track_stock: trackStock,
        updated_at: db.fn.now(),
      });

    await syncInStockFlag(trx, id, after, trackStock);

    await writeMovement(trx, {
      productId: id,
      type,
      quantity: delta,
      quantityBefore: before,
      quantityAfter: after,
      reason: payload.reason || null,
      referenceType: payload.referenceType || null,
      referenceId: payload.referenceId || null,
      createdBy: actorId,
    });

    return getInventoryItem(id);
  });
}

async function listMovements(filters = {}) {
  try {
    await ensureInventorySchema();
  } catch {
    return [];
  }
  const hasTable = await db.schema.hasTable('stock_movements');
  if (!hasTable) return [];

  let query = db('stock_movements')
    .leftJoin('products', 'stock_movements.product_id', 'products.id')
    .select(
      'stock_movements.*',
      'products.name as product_name',
    )
    .orderBy('stock_movements.created_at', 'desc')
    .limit(Math.min(Number(filters.limit) || 50, 200));

  if (filters.product_id || filters.productId) {
    query = query.where('stock_movements.product_id', filters.product_id || filters.productId);
  }

  if (filters.type) {
    query = query.where('stock_movements.type', String(filters.type).toLowerCase());
  }

  const rows = await query;
  return rows.map(formatMovement);
}

/**
 * Deduct stock for sold line items when tracking is enabled.
 * Safe no-op if inventory columns are missing.
 */
async function deductForSale(lineItems = [], meta = {}) {
  try {
    await ensureInventorySchema();
  } catch {
    return [];
  }
  if (!(await hasInventoryColumns())) return [];

  const results = [];
  await db.transaction(async (trx) => {
    for (const line of lineItems) {
      const productId = line.productId || line.product_id || line.menuItemId || line.id;
      const qty = Math.floor(Number(line.quantity) || 0);
      if (!productId || qty <= 0) continue;

      const product = await trx('products').where({ id: productId }).forUpdate().first();
      if (!product || !product.track_stock) continue;

      const before = Number(product.stock_qty) || 0;
      const after = Math.max(0, before - qty);

      await trx('products')
        .where({ id: productId })
        .update({
          stock_qty: after,
          in_stock: after > 0,
          updated_at: db.fn.now(),
        });

      await writeMovement(trx, {
        productId,
        type: 'sale',
        quantity: Math.min(qty, before),
        quantityBefore: before,
        quantityAfter: after,
        reason: meta.reason || 'Order sale',
        referenceType: meta.referenceType || 'order',
        referenceId: meta.referenceId || null,
        createdBy: meta.createdBy || null,
      });

      results.push({ productId, before, after });
    }
  });

  return results;
}

module.exports = {
  listInventory,
  getInventorySummary,
  getInventoryItem,
  updateInventorySettings,
  adjustStock,
  listMovements,
  deductForSale,
  stockStatus,
  hasInventoryColumns,
  ensureInventorySchema,
};
