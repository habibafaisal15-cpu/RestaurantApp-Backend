const db = require('../../config/database');
const { NotFoundError } = require('../../errors/AppError');
const marketingDealService = require('./marketingDealService');
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

async function buildSlidesFromCategories() {
  const categories = await db('menu_categories')
    .where({ is_active: true, show_in_hero: true })
    .orderBy('display_order', 'asc');

  return categories.map((cat) => ({
    id: cat.id,
    title: cat.hero_title || cat.category_name,
    subtitle: cat.description || '',
    image: cat.hero_image_url || cat.image_url || '',
    categoryId: cat.id,
    ctaLabel: `Explore ${cat.category_name}`,
  }));
}

async function getHeroContent() {
  const row = await db('hero_content').where({ id: HERO_ID }).first();
  if (!row) throw new NotFoundError('Hero content not found');

  const stored = parseJson(row.content, {});
  const slides = stored.slides?.length
    ? stored.slides
    : await buildSlidesFromCategories();

  const deals = await marketingDealService.listDeals({
    active: true,
    showOnCustomer: true,
  });

  return {
    slides,
    sideCards: stored.sideCards || [],
    topDeals: stored.topDeals || [],
    deals,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };}

async function updateHeroContent(payload) {
  const row = await db('hero_content').where({ id: HERO_ID }).first();
  if (!row) throw new NotFoundError('Hero content not found');

  const stored = parseJson(row.content, {});

  if (payload.slides) {
    for (const slide of payload.slides) {
      if (!slide.categoryId) continue;
      await db('menu_categories')
        .where({ id: slide.categoryId })
        .update({
          hero_title: slide.title,
          hero_image_url: slide.image,
          description: slide.subtitle ?? slide.description,
          show_in_hero: true,
          updated_at: db.fn.now(),
        });
    }
  }

  const nextContent = {
    slides: payload.slides ?? stored.slides ?? [],
    sideCards: payload.sideCards ?? stored.sideCards ?? [],
    topDeals: payload.topDeals ?? stored.topDeals ?? [],
    marketingDeals: stored.marketingDeals ?? [],
  };

  await db('hero_content')
    .where({ id: HERO_ID })
    .update({
      content: nextContent,
      updated_at: db.fn.now(),
    });

  return getHeroContent();
}

async function updateSlides(slides) {
  const row = await db('hero_content').where({ id: HERO_ID }).first();
  if (!row) throw new NotFoundError('Hero content not found');

  const stored = parseJson(row.content, {});
  const normalized = (slides || [])
    .map((slide, index) => ({
      id: slide.id,
      image: slide.image ?? '',
      title: slide.title ?? '',
      active: Boolean(slide.active && (slide.image ?? '').trim()),
      sortOrder: index + 1,
    }))
    .slice(0, 5);

  await db('hero_content')
    .where({ id: HERO_ID })
    .update({
      content: {
        ...stored,
        slides: normalized,
      },
      updated_at: db.fn.now(),
    });

  return normalized;
}

async function updateSideCards(sideCards) {
  const row = await db('hero_content').where({ id: HERO_ID }).first();
  if (!row) throw new NotFoundError('Hero content not found');

  const stored = parseJson(row.content, {});
  const normalized = (sideCards || [])
    .map((card, index) => ({ ...card, sortOrder: index + 1 }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  await db('hero_content')
    .where({ id: HERO_ID })
    .update({
      content: {
        ...stored,
        sideCards: normalized,
      },
      updated_at: db.fn.now(),
    });

  return normalized;
}

async function updateTopDeals(topDeals) {
  const row = await db('hero_content').where({ id: HERO_ID }).first();
  if (!row) throw new NotFoundError('Hero content not found');

  const stored = parseJson(row.content, {});

  await db('hero_content')
    .where({ id: HERO_ID })
    .update({
      content: {
        ...stored,
        topDeals: topDeals || [],
      },
      updated_at: db.fn.now(),
    });

  return topDeals || [];
}

module.exports = {
  getHeroContent,
  updateHeroContent,
  updateSlides,
  updateSideCards,
  updateTopDeals,
};
