const db = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../errors/AppError');
const {
  STATUS_TRANSITIONS,
  ADMIN_ACTIONS,
  KITCHEN_ACTIONS,
  RIDER_ACTIONS,
  WS_EVENTS,
} = require('../../../../shared/constants/orderStatus');
const { generateId } = require('../../utils/helpers');
const {
  formatTime,
  formatDateTime,
  extractArea,
  paymentLabel,
} = require('../../utils/adminFormatter');
const {
  RIDER_ASSIGN_TIMEOUT_SECONDS,
  addSeconds,
  buildRiderAssignTimer,
  buildCustomerNotification,
} = require('../../utils/orderTimer');
const { emitCustomerOrderEvent } = require('../../utils/customerEvents');
const customerNotifyService = require('../notifications/customerNotifyService');

function emitCustomerEvent(emit, event, order, message) {
  return emitCustomerOrderEvent(emit, event, order, message);
}

function formatOrder(row) {
  if (!row) return null;
  return {
    ...row,
    subtotal: Number(row.subtotal),
    delivery_fee: Number(row.delivery_fee),
    discount: Number(row.discount),
    total_amount: Number(row.total_amount),
  };
}

function getAvailableActions(order) {
  const actions = ADMIN_ACTIONS[order.order_status] || [];
  const timer = buildRiderAssignTimer(order);

  if (timer?.rider_assign_expired) {
    return actions.filter((action) => action.type !== 'assign_rider');
  }

  return actions;
}

function formatOrderListItem(order, zoneName, itemCount) {
  const timer = buildRiderAssignTimer(order);

  return {
    id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    area: extractArea(order.delivery_address, zoneName),
    delivery_address: order.delivery_address,
    order_time: order.order_time,
    order_time_display: formatTime(order.order_time),
    total_amount: Number(order.total_amount),
    order_status: order.order_status,
    order_channel: order.order_channel || 'ONLINE',
    order_type: order.order_type || 'DELIVERY',
    token_number: order.token_number || null,
    table_number: order.table_number || null,
    payment_method: order.payment_method,
    item_count: itemCount,
    rider_name: order.rider_name || null,
    timer,
  };
}

async function getZoneMap() {
  const zones = await db('delivery_zones').select('id', 'zone_name');
  return Object.fromEntries(zones.map((z) => [z.id, z.zone_name]));
}

async function getItemCounts(orderIds) {
  if (!orderIds.length) return {};

  const rows = await db('delivery_order_items')
    .whereIn('order_id', orderIds)
    .select('order_id')
    .count('id as count')
    .groupBy('order_id');

  return Object.fromEntries(rows.map((r) => [r.order_id, Number(r.count)]));
}

async function listOrders(filters = {}) {
  let query = db('delivery_orders').orderBy('order_time', 'desc');

  if (filters.status) {
    if (filters.status === 'New') {
      query = query.whereIn('order_status', ['New', 'Accepted']);
    } else if (filters.status === 'Preparing') {
      query = query.whereIn('order_status', [
        'Sent to Kitchen',
        'Preparing',
        'Order Prepared',
        'Rider Assigned',
      ]);
    } else if (filters.status === 'kitchen') {
      query = query.whereIn('order_status', [
        'Sent to Kitchen',
        'Preparing',
        'Order Prepared',
      ]);
    } else {
      query = query.where('order_status', filters.status);
    }
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.where((builder) => {
      builder
        .where('order_number', 'like', term)
        .orWhere('customer_name', 'like', term)
        .orWhere('delivery_address', 'like', term)
        .orWhere('customer_phone', 'like', term);
    });
  }

  const orders = await query;
  const zoneMap = await getZoneMap();
  const itemCounts = await getItemCounts(orders.map((o) => o.id));

  return orders.map((order) =>
    formatOrderListItem(order, zoneMap[order.zone_id], itemCounts[order.id] || 0),
  );
}

async function getOrderById(id) {
  const order = await db('delivery_orders').where({ id }).first();
  if (!order) throw new NotFoundError('Order not found');

  const items = await db('delivery_order_items').where({ order_id: id });
  const zone = await db('delivery_zones').where({ id: order.zone_id }).first();
  const formatted = formatOrder(order);
  const timer = buildRiderAssignTimer(formatted);

  return {
    id: formatted.id,
    order_number: formatted.order_number,
    order_status: formatted.order_status,
    order_channel: formatted.order_channel || 'ONLINE',
    order_type: formatted.order_type || 'DELIVERY',
    token_number: formatted.token_number || null,
    table_number: formatted.table_number || null,
    order_time: formatted.order_time,
    order_time_display: formatDateTime(formatted.order_time),
    accepted_at: formatted.accepted_at,
    estimated_delivery_time: formatted.estimated_delivery_time,
    delivered_at: formatted.delivered_at,
    timer,
    customer: {
      name: formatted.customer_name,
      phone: formatted.customer_phone,
      delivery_address: formatted.delivery_address,
      area: extractArea(formatted.delivery_address, zone?.zone_name),
      delivery_instructions: formatted.delivery_instructions,
    },
    items: items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
      notes: item.notes || null,
    })),
    pricing: {
      subtotal: formatted.subtotal,
      delivery_fee: formatted.delivery_fee,
      discount: formatted.discount,
      tax_amount: Number(formatted.tax_amount || 0),
      service_charge: Number(formatted.service_charge || 0),
      total_amount: formatted.total_amount,
    },
    payment: paymentLabel(formatted.payment_method, formatted.payment_status),
    zone: zone
      ? {
          id: zone.id,
          zone_name: zone.zone_name,
          base_fee: Number(zone.base_fee),
          estimated_time: zone.estimated_time,
        }
      : null,
    rider: formatted.rider_name
      ? {
          name: formatted.rider_name,
          phone: formatted.rider_phone,
        }
      : null,
    tracking_token: formatted.tracking_token,
    available_actions: getAvailableActions(formatted),
  };
}

async function getAdminStats() {
  const counts = await db('delivery_orders')
    .select('order_status')
    .count('id as count')
    .groupBy('order_status');

  const byStatus = {};
  for (const row of counts) {
    byStatus[row.order_status] = Number(row.count);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const deliveredTodayRow = await db('delivery_orders')
    .where('order_status', 'Delivered')
    .where('delivered_at', '>=', todayStart.toISOString())
    .count('id as count')
    .first();

  const newOrders = (byStatus.New || 0) + (byStatus.Accepted || 0);
  const preparing =
    (byStatus['Sent to Kitchen'] || 0)
    + (byStatus.Preparing || 0)
    + (byStatus['Order Prepared'] || 0)
    + (byStatus['Rider Assigned'] || 0);
  const outForDelivery = byStatus['Out for Delivery'] || 0;
  const deliveredToday = Number(deliveredTodayRow?.count || 0);
  const cancelled = (byStatus.Cancelled || 0) + (byStatus.Rejected || 0);

  const totalActive = newOrders + preparing + outForDelivery;
  const totalForOverview = totalActive + deliveredToday + cancelled;

  const breakdown = [
    { status: 'New', count: byStatus.New || 0 },
    { status: 'Accepted', count: byStatus.Accepted || 0 },
    { status: 'Sent to Kitchen', count: byStatus['Sent to Kitchen'] || 0 },
    { status: 'Preparing', count: byStatus.Preparing || 0 },
    { status: 'Order Prepared', count: byStatus['Order Prepared'] || 0 },
    { status: 'Rider Assigned', count: byStatus['Rider Assigned'] || 0 },
    { status: 'Out for Delivery', count: outForDelivery },
    { status: 'Delivered Today', count: deliveredToday },
    { status: 'Cancelled', count: byStatus.Cancelled || 0 },
    { status: 'Rejected', count: byStatus.Rejected || 0 },
  ]
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      percentage: totalForOverview
        ? Math.round((item.count / totalForOverview) * 1000) / 10
        : 0,
    }));

  return {
    stats: {
      new_orders: newOrders,
      preparing,
      out_for_delivery: outForDelivery,
      delivered_today: deliveredToday,
      cancelled,
    },
    overview: {
      total: totalForOverview,
      breakdown,
    },
  };
}

async function getSummary() {
  const { stats } = await getAdminStats();
  return stats;
}

async function getDashboard(filters = {}) {
  const [{ stats, overview }, orders] = await Promise.all([
    getAdminStats(),
    listOrders(filters),
  ]);

  return { stats, overview, orders };
}

async function updateOrderStatus(orderId, { status, set_by, note }, emit) {
  const order = await db('delivery_orders').where({ id: orderId }).first();
  if (!order) throw new NotFoundError('Order not found');

  const allowed = STATUS_TRANSITIONS[order.order_status] || [];
  if (!allowed.includes(status)) {
    throw new BadRequestError(
      `Cannot transition from "${order.order_status}" to "${status}"`,
    );
  }

  const updates = { order_status: status };
  const now = new Date();

  if (status === 'Accepted') {
    updates.accepted_at = now;
    updates.rider_assign_deadline = addSeconds(now, RIDER_ASSIGN_TIMEOUT_SECONDS);
  }

  if (status === 'Delivered') {
    updates.delivered_at = now;
    updates.payment_status = order.payment_method === 'COD' ? 'Settled' : 'Paid';
  }

  await db.transaction(async (trx) => {
    await trx('delivery_orders').where({ id: orderId }).update(updates);
    await trx('order_tracking_logs').insert({
      id: generateId(),
      order_id: orderId,
      status,
      set_by: set_by || 'Admin',
      note: note || null,
    });
  });

  const updatedRaw = await db('delivery_orders').where({ id: orderId }).first();
  const updated = await getOrderById(orderId);

  if (emit) {
    emitCustomerEvent(emit, WS_EVENTS.STATUS_CHANGED, updatedRaw);

    if (status === 'Accepted') {
      emitCustomerEvent(
        emit,
        WS_EVENTS.ORDER_ACCEPTED,
        updatedRaw,
        `Your order ${updated.order_number} has been accepted`,
      );

      customerNotifyService.notifyOrderAccepted(updatedRaw).catch((error) => {
        console.error('Customer accept notification failed:', error.message);
      });
    }

    if (status === 'Sent to Kitchen') {
      emitCustomerEvent(
        emit,
        WS_EVENTS.SENT_TO_KITCHEN,
        updatedRaw,
        `Order ${updated.order_number} sent to kitchen`,
      );
    }

    if (status === 'Order Prepared') {
      emitCustomerEvent(
        emit,
        WS_EVENTS.ORDER_PREPARED,
        updatedRaw,
        `Order ${updated.order_number} is ready for pickup`,
      );
    }

    if (status === 'Delivered') {
      emit(WS_EVENTS.DELIVERED, buildCustomerNotification(updatedRaw));
    }
  }

  return updated;
}

async function assignRider(orderId, payload, emit) {
  const order = await db('delivery_orders').where({ id: orderId }).first();
  if (!order) throw new NotFoundError('Order not found');

  const assignable = [
    'Accepted',
    'Sent to Kitchen',
    'Preparing',
    'Order Prepared',
    'Rider Assigned',
  ];
  if (!assignable.includes(order.order_status)) {
    throw new BadRequestError('Rider cannot be assigned in the current order status');
  }

  const timer = buildRiderAssignTimer(order);
  if (timer?.rider_assign_expired && order.order_status === 'Accepted') {
    throw new BadRequestError(
      `Rider must be assigned within ${RIDER_ASSIGN_TIMEOUT_SECONDS} seconds of accepting the order`,
    );
  }

  const { rider_name: riderName, rider_phone: riderPhone } = payload;

  // Keep kitchen flow intact — only jump to Rider Assigned once food is prepared.
  const nextStatus =
    order.order_status === 'Order Prepared' ? 'Rider Assigned' : order.order_status;

  await db.transaction(async (trx) => {
    await trx('delivery_orders').where({ id: orderId }).update({
      rider_id: null,
      rider_name: riderName,
      rider_phone: riderPhone,
      order_status: nextStatus,
    });

    await trx('order_tracking_logs').insert({
      id: generateId(),
      order_id: orderId,
      status: nextStatus === 'Rider Assigned' ? 'Rider Assigned' : order.order_status,
      set_by: payload.set_by || 'Admin',
      note: `Rider assigned: ${riderName} (${riderPhone})`,
    });
  });

  const updatedRaw = await db('delivery_orders').where({ id: orderId }).first();
  const updated = await getOrderById(orderId);

  if (emit) {
    emitCustomerEvent(
      emit,
      WS_EVENTS.STATUS_CHANGED,
      updatedRaw,
      `Order ${updated.order_number} — rider assigned`,
    );

    emitCustomerEvent(
      emit,
      WS_EVENTS.RIDER_ASSIGNED,
      updatedRaw,
      `Rider ${riderName} (${riderPhone}) assigned to order ${updated.order_number}`,
    );
  }

  return updated;
}

async function expireUnassignedOrders(emit) {
  // Only auto-cancel orders that were accepted but never sent to kitchen / assigned.
  const expiredOrders = await db('delivery_orders')
    .where('order_status', 'Accepted')
    .whereNotNull('rider_assign_deadline')
    .where('rider_assign_deadline', '<', new Date())
    .whereNull('rider_name');

  for (const order of expiredOrders) {
    await db.transaction(async (trx) => {
      await trx('delivery_orders').where({ id: order.id }).update({
        order_status: 'Cancelled',
      });
      await trx('order_tracking_logs').insert({
        id: generateId(),
        order_id: order.id,
        status: 'Cancelled',
        set_by: 'System',
        note: `Auto-cancelled: rider not assigned within ${RIDER_ASSIGN_TIMEOUT_SECONDS} seconds`,
      });
    });

    const updatedRaw = await db('delivery_orders').where({ id: order.id }).first();

    if (emit) {
      emitCustomerEvent(
        emit,
        WS_EVENTS.STATUS_CHANGED,
        updatedRaw,
        `Order ${updatedRaw.order_number} was cancelled — rider not assigned in time`,
      );
      emit(WS_EVENTS.RIDER_ASSIGN_EXPIRED, buildCustomerNotification(
        updatedRaw,
        `Rider assignment window expired for order ${updatedRaw.order_number}`,
      ));
    }
  }

  return expiredOrders.length;
}

async function getTrackingTimeline(orderId) {
  const order = await db('delivery_orders').where({ id: orderId }).first();
  if (!order) throw new NotFoundError('Order not found');

  const logs = await db('order_tracking_logs')
    .where({ order_id: orderId })
    .orderBy('logged_at', 'asc');

  return {
    order_id: orderId,
    order_number: order.order_number,
    current_status: order.order_status,
    timeline: logs.map((log) => ({
      status: log.status,
      set_by: log.set_by,
      note: log.note,
      logged_at: log.logged_at,
      logged_at_display: formatDateTime(log.logged_at),
    })),
  };
}

async function listKitchenOrders(filters = {}) {
  const status = filters.board || filters.status;
  let query = db('delivery_orders')
    .where('order_channel', 'ONLINE')
    .orderBy('order_time', 'desc');

  if (status === 'incoming' || status === 'Sent to Kitchen') {
    query = query.where('order_status', 'Sent to Kitchen');
  } else if (status === 'preparing' || status === 'Preparing') {
    query = query.where('order_status', 'Preparing');
  } else if (status === 'prepared' || status === 'Order Prepared') {
    query = query.whereIn('order_status', ['Order Prepared', 'Rider Assigned']);
  } else if (status === 'history') {
    query = query.whereIn('order_status', [
      'Order Prepared',
      'Rider Assigned',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
    ]);
  } else {
    query = query.whereIn('order_status', [
      'Sent to Kitchen',
      'Preparing',
      'Order Prepared',
      'Rider Assigned',
    ]);
  }

  const orders = await query.limit(Number(filters.limit) || 100);
  const zoneMap = await getZoneMap();
  const detailed = [];

  for (const order of orders) {
    const items = await db('delivery_order_items').where({ order_id: order.id });
    detailed.push({
      ...formatOrderListItem(order, zoneMap[order.zone_id], items.length),
      delivery_instructions: order.delivery_instructions,
      items: items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        notes: item.notes || null,
      })),
      kitchen_actions: KITCHEN_ACTIONS[order.order_status] || [],
    });
  }

  return detailed;
}

async function listRiderOrders(riderPhone, filters = {}) {
  if (!riderPhone) return [];

  let query = db('delivery_orders')
    .where('rider_phone', riderPhone)
    .orderBy('order_time', 'desc');

  if (filters.status === 'active') {
    query = query.whereIn('order_status', [
      'Order Prepared',
      'Rider Assigned',
      'Out for Delivery',
    ]);
  } else if (filters.status === 'ready') {
    query = query.whereIn('order_status', ['Order Prepared', 'Rider Assigned']);
  }

  const orders = await query.limit(Number(filters.limit) || 50);
  const zoneMap = await getZoneMap();

  return orders.map((order) => ({
    ...formatOrderListItem(order, zoneMap[order.zone_id], 0),
    delivery_address: order.delivery_address,
    delivery_instructions: order.delivery_instructions,
    rider_actions: RIDER_ACTIONS[order.order_status] || [],
  }));
}

module.exports = {
  listOrders,
  getOrderById,
  getSummary,
  getDashboard,
  updateOrderStatus,
  assignRider,
  expireUnassignedOrders,
  getTrackingTimeline,
  listKitchenOrders,
  listRiderOrders,
};
