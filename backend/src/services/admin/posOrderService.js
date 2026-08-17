const db = require('../../config/database');
const { BadRequestError } = require('../../errors/AppError');
const {
  generateId,
  generateTrackingToken,
  generateOrderNumber,
} = require('../../utils/helpers');
const settingsService = require('./settingsService');
const slipService = require('./slipService');
const inventoryService = require('./inventoryService');
const { IN_STORE_ZONE_ID } = require('../../config/zones');

async function getNextOrderNumber(trx) {
  const result = await trx('delivery_orders').count('id as count').first();
  const count = Number(result?.count || 0) + 1;
  return generateOrderNumber(count);
}

async function getNextTokenNumber(trx) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await trx('delivery_orders')
    .where('order_channel', 'IN_RESTAURANT')
    .where('order_time', '>=', todayStart.toISOString())
    .count('id as count')
    .first();

  const count = Number(result?.count || 0) + 1;
  return `T-${String(count).padStart(3, '0')}`;
}

function mapPaymentMethod(method) {
  const value = String(method || 'cash').toLowerCase();
  if (value === 'cash') return 'Cash';
  if (value === 'card') return 'Card';
  if (value === 'online') return 'Online';
  return method;
}

function mapPaymentStatus(status, method) {
  const value = String(status || 'pending').toLowerCase();
  if (value === 'paid') return 'Paid';
  if (method === 'Cash' || method === 'COD') return 'Pending';
  return 'Pending';
}

function formatWalkInOrder(order, items) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    channel: order.order_channel,
    type: order.order_type,
    status: 'preparing',
    orderStatus: order.order_status,
    customer: {
      name: order.customer_name,
      phone: order.customer_phone,
    },
    items: items.map((item) => ({
      id: item.id,
      menuItemId: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      price: Number(item.unit_price),
      total: Number(item.total_price),
      notes: item.notes || '',
    })),
    subtotal: Number(order.subtotal),
    tax: Number(order.tax_amount),
    serviceCharge: Number(order.service_charge),
    deliveryFee: Number(order.delivery_fee),
    discount: Number(order.discount),
    total: Number(order.total_amount),
    paymentMethod: String(order.payment_method).toLowerCase(),
    paymentStatus: order.payment_status === 'Paid' ? 'paid' : 'pending',
    tokenNumber: order.token_number,
    tableNumber: order.table_number,
    createdAt: order.order_time,
    updatedAt: order.order_time,
  };
}

async function createWalkInOrder(payload) {
  const settings = await settingsService.getSettings();
  const menuItemIds = (payload.items || []).map((item) => item.menuItemId || item.product_id);

  if (!menuItemIds.length) {
    throw new BadRequestError('Order must include at least one item');
  }

  return db.transaction(async (trx) => {
    const products = await trx('products')
      .whereIn('id', menuItemIds)
      .where({ is_active: true });

    if (products.length !== menuItemIds.length) {
      throw new BadRequestError('One or more menu items are invalid or unavailable');
    }

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
    let subtotal = 0;

    const lineItems = payload.items.map((item) => {
      const product = productMap[item.menuItemId || item.product_id];
      const unitPrice = Number(product.price);
      const quantity = Number(item.quantity);
      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;

      return {
        id: generateId(),
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        notes: item.notes || null,
      };
    });

    const tax = Math.round(subtotal * (Number(settings.taxPercent || 0) / 100));
    const serviceCharge = Math.round(
      subtotal * (Number(settings.serviceChargePercent || 0) / 100),
    );
    const deliveryFee = 0;
    const discount = Number(payload.discount || 0);
    const totalAmount = subtotal + tax + serviceCharge + deliveryFee - discount;

    if (totalAmount < 0) {
      throw new BadRequestError('Invalid order total');
    }

    const orderType = payload.type || 'DINE_IN';
    const tableNumber = payload.tableNumber || null;
    const customerName = payload.customer?.name || 'Walk-in Guest';
    const customerPhone = payload.customer?.phone || '0000000000';
    const paymentMethod = mapPaymentMethod(payload.paymentMethod);
    const paymentStatus = mapPaymentStatus(payload.paymentStatus, paymentMethod);

    let deliveryAddress = 'In-Restaurant';
    if (orderType === 'DINE_IN' && tableNumber) {
      deliveryAddress = `Table ${tableNumber}`;
    } else if (orderType === 'TAKEAWAY') {
      deliveryAddress = 'Takeaway Counter';
    }

    const orderId = generateId();
    const orderNumber = await getNextOrderNumber(trx);
    const tokenNumber = await getNextTokenNumber(trx);
    const trackingToken = generateTrackingToken();

    let zoneId = IN_STORE_ZONE_ID;
    const inStoreZone = await trx('delivery_zones').where({ id: IN_STORE_ZONE_ID }).first();
    if (!inStoreZone) {
      const fallbackZone = await trx('delivery_zones').where({ is_active: true }).first();
      zoneId = fallbackZone?.id;
    }

    if (!zoneId) {
      throw new BadRequestError('No delivery zone configured for in-store orders');
    }

    await trx('delivery_orders').insert({
      id: orderId,
      order_number: orderNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_address: deliveryAddress,
      delivery_instructions: payload.notes || null,
      zone_id: zoneId,
      order_status: 'Preparing',
      tracking_token: trackingToken,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      tax_amount: tax,
      service_charge: serviceCharge,
      total_amount: totalAmount,
      order_channel: 'IN_RESTAURANT',
      order_type: orderType,
      table_number: tableNumber,
      token_number: tokenNumber,
    });

    await trx('delivery_order_items').insert(
      lineItems.map((item) => ({ ...item, order_id: orderId })),
    );

    await trx('order_tracking_logs').insert({
      id: generateId(),
      order_id: orderId,
      status: 'Preparing',
      set_by: payload.cashierName || 'POS',
      note: 'Walk-in order placed',
    });

    const order = await trx('delivery_orders').where({ id: orderId }).first();
    const items = await trx('delivery_order_items').where({ order_id: orderId });
    return { order, items, autoSlip: settings.autoSlipWalkIn, orderId };
  }).then(async ({ order, items, autoSlip, orderId }) => {
    const formatted = formatWalkInOrder(order, items);

    try {
      await inventoryService.deductForSale(items, {
        reason: 'POS walk-in order',
        referenceType: 'order',
        referenceId: orderId,
      });
    } catch (error) {
      console.error('POS inventory deduct failed:', error.message);
    }

    if (autoSlip) {
      try {
        const slip = await slipService.generateSlip(orderId, 'kitchen');
        formatted.slip = {
          id: slip.id,
          slipType: slip.slipType,
          printedAt: slip.printedAt,
        };
      } catch (error) {
        console.error('Auto slip generation failed:', error.message);
      }
    }

    return formatted;
  });
}

module.exports = {
  createWalkInOrder,
};
