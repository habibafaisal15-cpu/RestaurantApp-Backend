const db = require('../../config/database');
const { NotFoundError } = require('../../errors/AppError');
const { generateId } = require('../../utils/helpers');

const HERO_ID = 'default';

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
    badge: deal.badge || '',
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

async function listDeals(filters = {}) {
  const { stored } = await readContent();
  const deals = stored.marketingDeals || [];
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
    active: payload.active ?? true,
    showOnCustomer: payload.showOnCustomer ?? true,
    sortOrder: payload.sortOrder ?? maxSort + 1,
    createdAt: now,
    updatedAt: now,
  };

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
    active: payload.active != null ? payload.active : current.active,
    showOnCustomer:
      payload.showOnCustomer != null ? payload.showOnCustomer : current.showOnCustomer,
    updatedAt: new Date().toISOString(),
  };

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
};
