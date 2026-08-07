const db = require('../../config/database');
const { NotFoundError } = require('../../errors/AppError');
const { generateId } = require('../../utils/helpers');

const HERO_ID = 'default';
const DEALS_CATEGORY_NAME = 'Deals';
function parseJson(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function readContent() {
  const row = await db('hero_content').where({ id: HERO_ID }).first();
  if (!row) throw new NotFoundError('Hero content not found');
  return { row, stored: parseJson(row.content, {}) };
}

async function writeContent(stored) {
  await db('hero_content')
    .where({ id: HERO_ID })
    .update({
      content: stored,
      updated_at: db.fn.now(),
    });
}

function formatDeal(deal) {
  return {
    id: deal.id,
    title: deal.title,
    description: deal.description || '',
    price: Number(deal.price),
    originalPrice: deal.originalPrice != null ? Number(deal.originalPrice) : undefined,
    image: deal.image || '',
    image_url: deal.image || deal.image_url || '',
    badge: deal.badge || '',
    productId: deal.productId || deal.product_id || null,
    active: deal.active !== false,
    showOnCustomer: deal.showOnCustomer !== false,
    sortOrder: deal.sortOrder ?? 0,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

function applyFilters(deals, filters = {}) {
  let list = [...deals];

  if (filters.active != null) {
    list = list.filter((d) => d.active === filters.active);
  }
  if (filters.showOnCustomer != null) {
    list = list.filter((d) => d.showOnCustomer === filters.showOnCustomer);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.badge || '').toLowerCase().includes(q),
    );
  }

  return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

async function resolveProductId(deal) {
  if (deal.productId) return deal.productId;
  if (deal.product_id) return deal.product_id;
  if (!deal.title?.trim()) return null;

  const title = deal.title.trim().toLowerCase();

  let product = await db('products')
    .where({ is_active: true, available_for_delivery: true })
    .whereRaw('LOWER(TRIM(name)) = ?', [title])
    .first();
  if (product) return product.id;

  product = await db('products')
    .where({ is_active: true, available_for_delivery: true })
    .whereRaw('LOWER(name) LIKE ?', [`%${title}%`])
    .orderBy('name', 'asc')
    .first();
  if (product) return product.id;

  const candidates = await db('products')
    .where({ is_active: true, available_for_delivery: true })
    .select('id', 'name');

  let bestMatch = null;
  for (const candidate of candidates) {
    const name = candidate.name.trim().toLowerCase();
    if (title.includes(name) && (!bestMatch || name.length > bestMatch.name.length)) {
      bestMatch = candidate;
    }
  }

  return bestMatch?.id || null;
}

function normalizeImageUrl(image) {
  if (!image) return null;
  const value = String(image).trim();
  if (!value) return null;
  if (value.startsWith('/uploads/') || value.startsWith('/')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      return url.pathname || null;
    } catch {
      return value;
    }
  }
  return value;
}

async function ensureDealsCategory() {
  const existing = await db('menu_categories')
    .whereRaw('LOWER(category_name) = ?', [DEALS_CATEGORY_NAME.toLowerCase()])
    .first();

  if (existing) return existing.id;

  const categoryId = generateId();
  await db('menu_categories').insert({
    id: categoryId,
    category_name: DEALS_CATEGORY_NAME,
    display_order: 999,
    is_active: false,
    show_in_hero: false,
  });

  return categoryId;
}

async function updateProductForDeal(deal) {
  if (!deal.productId) return null;

  const existing = await db('products').where({ id: deal.productId }).first();
  if (!existing) return null;

  await db('products')
    .where({ id: deal.productId })
    .update({
      name: deal.title.trim().slice(0, 100),
      description: deal.description || '',
      price: Number(deal.price) || 0,
      image_url: normalizeImageUrl(deal.image),
      is_active: deal.active !== false && deal.showOnCustomer !== false,
      available_for_delivery: true,
      in_stock: true,
    });

  return deal.productId;
}

async function syncProductForDeal(deal) {
  let linkedProductId = deal.productId || deal.product_id || null;

  if (linkedProductId) {
    const existing = await db('products').where({ id: linkedProductId }).first();
    if (existing) {
      await updateProductForDeal({ ...deal, productId: linkedProductId });
      return linkedProductId;
    }
    linkedProductId = null;
  }

  linkedProductId = await resolveProductId({ ...deal, productId: null, product_id: null });
  if (linkedProductId) {
    await updateProductForDeal({ ...deal, productId: linkedProductId });
    return linkedProductId;
  }

  const categoryId = await ensureDealsCategory();
  const productId = generateId();

  await db('products').insert({
    id: productId,
    category_id: categoryId,
    name: deal.title.trim().slice(0, 100),
    description: deal.description || '',
    price: Number(deal.price) || 0,
    image_url: normalizeImageUrl(deal.image),
    available_for_delivery: true,
    in_stock: true,
    is_active: deal.active !== false && deal.showOnCustomer !== false,
  });

  return productId;
}

async function persistDealProductId(dealId, productId, stored) {
  const deals = stored.marketingDeals || [];
  const index = deals.findIndex((entry) => entry.id === dealId);
  if (index === -1 || deals[index].productId === productId) {
    return false;
  }

  deals[index].productId = productId;
  stored.marketingDeals = deals;
  await writeContent(stored);
  return true;
}
async function listDeals(filters = {}, options = {}) {
  const { stored } = await readContent();
  const deals = stored.marketingDeals || [];
  // Storefront must stay read-only — product sync happens on admin create/update.
  return applyFilters(deals, filters).map(formatDeal);
}

async function getDealById(id) {
  const deals = await listDeals();
  const deal = deals.find((d) => d.id === id);
  if (!deal) throw new NotFoundError('Deal not found');
  return deal;
}

async function createDeal(payload) {
  const { stored } = await readContent();
  const deals = stored.marketingDeals || [];
  const maxSort = deals.reduce((max, d) => Math.max(max, d.sortOrder || 0), 0);
  const now = new Date().toISOString();

  const deal = {
    id: generateId(),
    title: payload.title.trim(),
    description: payload.description?.trim() ?? '',
    price: Number(payload.price) || 0,
    originalPrice:
      payload.originalPrice != null && payload.originalPrice !== ''
        ? Number(payload.originalPrice)
        : undefined,
    image: payload.image ?? '',
    badge: payload.badge?.trim() ?? '',
    productId: payload.productId || payload.product_id || null,
    active: payload.active ?? true,
    showOnCustomer: payload.showOnCustomer ?? true,
    sortOrder: payload.sortOrder ?? maxSort + 1,
    createdAt: now,
    updatedAt: now,
  };

  try {
    deal.productId = await syncProductForDeal(deal);
  } catch (err) {
    console.error('Failed to sync deal product on create:', err.message);
  }

  deals.unshift(deal);
  await writeContent({ ...stored, marketingDeals: deals });
  return formatDeal(deal);
}

async function updateDeal(id, payload) {
  const { stored } = await readContent();
  const deals = stored.marketingDeals || [];
  const index = deals.findIndex((d) => d.id === id);
  if (index === -1) throw new NotFoundError('Deal not found');

  const current = deals[index];
  deals[index] = {
    ...current,
    title: payload.title != null ? String(payload.title).trim() : current.title,
    description:
      payload.description != null ? String(payload.description).trim() : current.description,
    price: payload.price != null ? Number(payload.price) : current.price,
    originalPrice:
      payload.originalPrice === '' || payload.originalPrice == null
        ? payload.originalPrice === ''
          ? undefined
          : current.originalPrice
        : Number(payload.originalPrice),
    image: payload.image != null ? payload.image : current.image,
    badge: payload.badge != null ? payload.badge : current.badge,
    productId:
      payload.productId === ''
        ? null
        : payload.productId != null
          ? payload.productId
          : payload.product_id != null
            ? payload.product_id
            : current.productId,
    active: payload.active != null ? payload.active : current.active,
    showOnCustomer:
      payload.showOnCustomer != null ? payload.showOnCustomer : current.showOnCustomer,
    updatedAt: new Date().toISOString(),
  };

  try {
    deals[index].productId = await syncProductForDeal(deals[index]);
  } catch (err) {
    console.error('Failed to sync deal product on update:', err.message);
  }

  await writeContent({ ...stored, marketingDeals: deals });
  return formatDeal(deals[index]);
}

async function removeDeal(id) {
  return updateDeal(id, { active: false, showOnCustomer: false });
}

module.exports = {
  listDeals,
  getDealById,
  createDeal,
  updateDeal,
  removeDeal,
  resolveProductId,
  syncProductForDeal,
};