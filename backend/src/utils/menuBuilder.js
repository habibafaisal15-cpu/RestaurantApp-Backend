function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function parseProductIds(raw) {
  if (raw == null || raw === '' || raw === 'null') return null;
  if (Array.isArray(raw)) return raw.length ? raw : null;
  if (typeof raw === 'string') {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  }
  return null;
}

function dealAppliesToProduct(deal, productId) {
  const ids = parseProductIds(deal.product_ids);
  if (!ids) return true;
  return ids.includes(productId);
}

function computeDealPrice(price, deal) {
  const base = Number(price);
  const value = Number(deal.discount_value);

  if (deal.discount_type === 'fixed') {
    return roundMoney(Math.max(0, base - value));
  }

  return roundMoney(Math.max(0, base * (1 - value / 100)));
}

function findBestDealForProduct(productId, price, deals) {
  let best = null;

  for (const deal of deals) {
    if (!dealAppliesToProduct(deal, productId)) continue;

    const dealPrice = computeDealPrice(price, deal);
    if (dealPrice >= price) continue;

    const savings = price - dealPrice;
    if (!best || savings > best.savings) {
      best = {
        deal,
        deal_price: dealPrice,
        savings,
      };
    }
  }

  return best;
}

function formatStorefrontProduct(product, deals = []) {
  const price = Number(product.price);
  const item = {
    id: product.id,
    name: product.name,
    description: product.description,
    image_url: product.image_url,
    price,
    in_stock: Boolean(product.in_stock),
    available_for_delivery: Boolean(product.available_for_delivery),
  };

  const best = findBestDealForProduct(product.id, price, deals);
  if (best) {
    item.deal_price = best.deal_price;
    item.deal = {
      id: best.deal.id,
      title: best.deal.title,
      discount_type: best.deal.discount_type,
      discount_value: Number(best.deal.discount_value),
    };
  }

  return item;
}

function formatStorefrontDeal(deal) {
  return {
    id: deal.id,
    title: deal.title,
    description: deal.description,
    image_url: deal.image_url,
    discount_type: deal.discount_type,
    discount_value: Number(deal.discount_value),
    product_ids: parseProductIds(deal.product_ids),
    product_id: deal.product_id || null,
    starts_at: deal.starts_at,
    ends_at: deal.ends_at,
    price: deal.price != null ? Number(deal.price) : undefined,
    original_price: deal.original_price != null ? Number(deal.original_price) : undefined,
    badge: deal.badge || undefined,
  };
}

function buildStorefrontMenu({ zoneId, categories, products, deals, pricingDeals = deals }) {
  const menu = categories.map((category) => ({
    id: category.id,
    category_name: category.category_name,
    display_order: category.display_order,
    image_url: category.image_url || null,
    hero_image_url: category.hero_image_url || null,
    hero_title: category.hero_title || category.category_name,
    show_in_hero: Boolean(category.show_in_hero),
    items: products
      .filter((p) => p.category_id === category.id)
      .map((p) => formatStorefrontProduct(p, pricingDeals)),
  }));

  return {
    zone_id: zoneId,
    categories: menu.filter((c) => c.items.length > 0),
    deals: deals.map(formatStorefrontDeal),
  };
}

module.exports = {
  parseProductIds,
  dealAppliesToProduct,
  computeDealPrice,
  findBestDealForProduct,
  formatStorefrontProduct,
  formatStorefrontDeal,
  buildStorefrontMenu,
};
