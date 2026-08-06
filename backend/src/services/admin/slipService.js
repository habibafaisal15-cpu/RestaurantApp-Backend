const db = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../errors/AppError');
const { generateId } = require('../../utils/helpers');
const settingsService = require('./settingsService');

function formatSlip(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    slipType: row.slip_type,
    tokenNumber: row.token_number,
    tableNumber: row.table_number,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    customerName: row.customer_name,
    channel: row.channel,
    orderType: row.order_type,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    serviceCharge: Number(row.service_charge),
    total: Number(row.total),
    footer: row.footer,
    printedAt: row.printed_at,
    reprintCount: row.reprint_count,
    createdAt: row.created_at,
  };
}

async function buildSlipFromOrder(orderId, slipType = 'kitchen') {
  const order = await db('delivery_orders').where({ id: orderId }).first();
  if (!order) throw new NotFoundError('Order not found');

  const items = await db('delivery_order_items').where({ order_id: orderId });
  const settings = await settingsService.getSettings();

  return {
    order_id: order.id,
    order_number: order.order_number,
    slip_type: slipType,
    token_number: order.token_number,
    table_number: order.table_number,
    items: items.map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      notes: item.notes || '',
    })),
    customer_name: order.customer_name,
    channel: order.order_channel || 'ONLINE',
    order_type: order.order_type || 'DELIVERY',
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    subtotal: order.subtotal,
    tax: order.tax_amount || 0,
    service_charge: order.service_charge || 0,
    total: order.total_amount,
    footer: settings.slipFooter || '',
  };
}

async function generateSlip(orderId, slipType = 'kitchen') {
  const payload = await buildSlipFromOrder(orderId, slipType);
  const id = generateId();

  const [slip] = await db('order_slips')
    .insert({
      id,
      order_id: payload.order_id,
      order_number: payload.order_number,
      slip_type: payload.slip_type,
      token_number: payload.token_number,
      table_number: payload.table_number,
      items: db.raw('?::jsonb', [JSON.stringify(payload.items)]),
      customer_name: payload.customer_name,
      channel: payload.channel,
      order_type: payload.order_type,
      payment_method: payload.payment_method,
      payment_status: payload.payment_status,
      subtotal: payload.subtotal,
      tax: payload.tax,
      service_charge: payload.service_charge,
      total: payload.total,
      footer: payload.footer,
      reprint_count: 0,
    })
    .returning('*');

  return formatSlip(slip);
}

async function getSlipsByOrder(orderId) {
  const rows = await db('order_slips')
    .where({ order_id: orderId })
    .orderBy('created_at', 'desc');

  return rows.map(formatSlip);
}

async function listSlips(filters = {}) {
  let query = db('order_slips').orderBy('created_at', 'desc');

  if (filters.orderId) {
    query = query.where('order_id', filters.orderId);
  }
  if (filters.slipType) {
    query = query.where('slip_type', filters.slipType);
  }
  if (filters.from) {
    query = query.where('created_at', '>=', filters.from);
  }
  if (filters.to) {
    query = query.where('created_at', '<=', filters.to);
  }

  const rows = await query;
  return rows.map(formatSlip);
}

async function reprintSlip(slipId) {
  const slip = await db('order_slips').where({ id: slipId }).first();
  if (!slip) throw new NotFoundError('Slip not found');

  const [updated] = await db('order_slips')
    .where({ id: slipId })
    .update({
      reprint_count: slip.reprint_count + 1,
      printed_at: db.fn.now(),
    })
    .returning('*');

  return formatSlip(updated);
}

module.exports = {
  generateSlip,
  getSlipsByOrder,
  listSlips,
  reprintSlip,
};
