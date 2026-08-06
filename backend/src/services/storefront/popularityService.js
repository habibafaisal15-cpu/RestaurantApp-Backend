const db = require('../../config/database');
const salesService = require('../admin/salesService');
const catalogService = require('../delivery/catalogService');
const marketingDealService = require('../admin/marketingDealService');
const { findBestDealForProduct } = require('../../utils/menuBuilder');

const ALL_TIME_FROM = '1970-01-01T00:00:00.000Z';

function formatPopularProduct(product, quantitySold) {
  return {
    id: product.id,
    product_id: product.id,
    name: product.name,
    title: product.name,
    description: product.description || '',
    price: Number(product.price),
    image_url: product.image_url || '',
    quantity_sold: quantitySold,
  };
}

function formatPopularDealProduct(product, bestDeal, quantitySold) {
  const originalPrice = Number(product.price);

  return {
    id: product.id,
    product_id: product.id,
    name: product.name,
    title: bestDeal.deal.title || product.name,
    description: product.description || bestDeal.deal.title || '',
    price: bestDeal.deal_price,
    original_price: originalPrice,
    image_url: product.image_url || '',
    discount_type: bestDeal.deal.discount_type,
    discount_value: Number(bestDeal.deal.discount_value),
    quantity_sold: quantitySold,
  };
}

function mapMarketingDealFallback(deal) {
  const price = Number(deal.price) || 0;
  const originalPrice =
    deal.originalPrice != null ? Number(deal.originalPrice) : undefined;

  return {
    id: deal.id,
    product_id: deal.productId || null,
    title: deal.title,
    name: deal.title,
    description: deal.description || '',
    price,
    original_price: originalPrice,
    image_url: deal.image || '',
    discount_type: 'fixed',
    discount_value:
      originalPrice != null ? Math.max(0, originalPrice - price) : price,
    badge: deal.badge || '',
  };
}

async function loadActiveProducts(productIds = []) {
  if (!productIds.length) return new Map();

  const rows = await db('products')
    .whereIn('id', productIds)
    .where({ is_active: true, available_for_delivery: true });

  return new Map(rows.map((row) => [row.id, row]));
}

async function getTopSellingProducts(limit = 3) {
  const topItems = await salesService.getByItem({
    from: ALL_TIME_FROM,
    to: new Date().toISOString(),
    range: 'custom',
  });

  const productMap = await loadActiveProducts(
    topItems.map((item) => item.menuItemId).filter(Boolean),
  );

  return topItems
    .filter((item) => productMap.has(item.menuItemId))
    .slice(0, limit)
    .map((item) =>
      formatPopularProduct(productMap.get(item.menuItemId), item.quantity),
    );
}

async function getTopSellingDealProducts(limit = 3) {
  const catalogDeals = await catalogService.listDeals({ active_only: true });
  const topItems = await salesService.getByItem({
    from: ALL_TIME_FROM,
    to: new Date().toISOString(),
    range: 'custom',
  });

  const productMap = await loadActiveProducts(
    topItems.map((item) => item.menuItemId).filter(Boolean),
  );

  const dealProducts = topItems
    .map((item) => {
      const product = productMap.get(item.menuItemId);
      if (!product) return null;

      const bestDeal = findBestDealForProduct(
        product.id,
        Number(product.price),
        catalogDeals,
      );
      if (!bestDeal) return null;

      return formatPopularDealProduct(product, bestDeal, item.quantity);
    })
    .filter(Boolean)
    .slice(0, limit);

  if (dealProducts.length >= limit) {
    return dealProducts;
  }

  const marketingDeals = await marketingDealService.listDeals(
    {
      active: true,
      showOnCustomer: true,
    },
    { forStorefront: true },
  );

  const seen = new Set(dealProducts.map((deal) => deal.id));
  for (const deal of marketingDeals) {
    if (dealProducts.length >= limit) break;
    if (seen.has(deal.id)) continue;
    dealProducts.push(mapMarketingDealFallback(deal));
    seen.add(deal.id);
  }

  return dealProducts.slice(0, limit);
}

async function getPopularSections(limit = 3) {
  const [bestSellers, topSellingDeals] = await Promise.all([
    getTopSellingProducts(limit),
    getTopSellingDealProducts(limit),
  ]);

  return {
    best_sellers: bestSellers,
    top_selling_deals: topSellingDeals,
  };
}

module.exports = {
  getTopSellingProducts,
  getTopSellingDealProducts,
  getPopularSections,
};
