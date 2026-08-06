const db = require('../../config/database');
const { BadRequestError, NotFoundError } = require('../../errors/AppError');
const {
  generateId,
  generateTrackingToken,
  generateOrderNumber,
} = require('../../utils/helpers');
const { findBestDealForProduct } = require('../../utils/menuBuilder');
const catalogService = require('../delivery/catalogService');
const marketingDealService = require('../admin/marketingDealService');
const { findZoneById } = require('./locationService');

async function buildMarketingPriceMap() {
  const deals = await marketingDealService.listDeals(
    { active: true, showOnCustomer: true },
    { forStorefront: true },
  );
  const map = new Map();

  for (const deal of deals) {
    if (deal.productId) {
      map.set(deal.productId, Number(deal.price));
    }
  }

  return map;
}

async function resolveUnitPrice(product, marketingPrices, catalogDeals) {
  const marketingPrice = marketingPrices.get(product.id);
  if (marketingPrice != null) {
    return marketingPrice;
  }

  const bestDeal = findBestDealForProduct(
    product.id,
    Number(product.price),
    catalogDeals,
  );
  if (bestDeal) {
    return bestDeal.deal_price;
  }

  return Number(product.price);
}

async function getNextOrderNumber(trx) {
  const result = await trx('delivery_orders').count('id as count').first();
  const count = Number(result?.count || 0) + 1;
  return generateOrderNumber(count);
}

async function createOrder(payload) {
  const zone = await findZoneById(payload.zone_id);

  return db.transaction(async (trx) => {
    const productIds = payload.items.map((i) => i.product_id);
    const products = await trx('products')
      .whereIn('id', productIds)
      .where({ is_active: true, available_for_delivery: true });

    if (products.length !== productIds.length) {
      throw new BadRequestError('One or more products are invalid or unavailable');
    }

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    for (const item of payload.items) {
      const product = productMap[item.product_id];
      if (!product.in_stock) {
        throw new BadRequestError(`${product.name} is out of stock`);
      }
    }

    let subtotal = 0;
    const marketingPrices = await buildMarketingPriceMap();
    const catalogDeals = await catalogService.listDeals({ active_only: true });
    const lineItems = payload.items.map((item) => {
      const product = productMap[item.product_id];
      const unitPrice = resolveUnitPrice(product, marketingPrices, catalogDeals);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      return {
        id: generateId(),
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      };
    });

    const deliveryFee = Number(zone.base_fee);
    const discount = Number(payload.discount || 0);
    const totalAmount = subtotal + deliveryFee - discount;

    if (totalAmount < 0) {
      throw new BadRequestError('Invalid order total');
    }

    const orderId = generateId();
    const trackingToken = generateTrackingToken();
    const orderNumber = await getNextOrderNumber(trx);

    const estimatedDeliveryTime = new Date(Date.now() + 35 * 60 * 1000);

    await trx('delivery_orders').insert({
      id: orderId,
      order_number: orderNumber,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      delivery_address: payload.delivery_address,
      delivery_instructions: payload.delivery_instructions || null,
      delivery_latitude: payload.delivery_latitude ?? null,
      delivery_longitude: payload.delivery_longitude ?? null,
      delivery_place_id: payload.delivery_place_id ?? null,
      zone_id: zone.id,
      order_status: 'New',
      tracking_token: trackingToken,
      payment_status: payload.payment_method === 'Online' ? 'Paid' : 'Pending',
      payment_method: payload.payment_method,
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      total_amount: totalAmount,
      estimated_delivery_time: estimatedDeliveryTime,
    });

    await trx('delivery_order_items').insert(
      lineItems.map((item) => ({ ...item, order_id: orderId })),
    );

    await trx('order_tracking_logs').insert({
      id: generateId(),
      order_id: orderId,
      status: 'New',
      set_by: payload.customer_name,
      note: 'Order placed by customer',
    });

    return {
      id: orderId,
      order_number: orderNumber,
      tracking_token: trackingToken,
      tracking_url: `/track/${trackingToken}`,
      order_status: 'New',
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      total_amount: totalAmount,
      payment_method: payload.payment_method,
      estimated_delivery_time: estimatedDeliveryTime,
    };
  });
}

module.exports = { createOrder };
