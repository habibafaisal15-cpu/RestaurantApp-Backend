const db = require('../../config/database');

function resolveDateRange(params = {}) {
  const now = new Date();
  let from;
  let to = params.to ? new Date(params.to) : now;

  if (params.from) {
    from = new Date(params.from);
  } else {
    from = new Date(now);
    const range = params.range || 'weekly';

    if (range === 'daily') {
      from.setHours(0, 0, 0, 0);
    } else if (range === 'monthly') {
      from.setDate(from.getDate() - 30);
    } else {
      from.setDate(from.getDate() - 7);
    }
  }

  from.setHours(0, 0, 0, 0);
  if (!params.to) {
    to = new Date();
    to.setHours(23, 59, 59, 999);
  }

  return { from, to, range: params.range || 'custom' };
}

function isInRestaurantChannel(order) {
  return order.order_channel === 'IN_RESTAURANT';
}

function isOnlineDelivered(order) {
  return !isInRestaurantChannel(order) && order.order_status === 'Delivered';
}

function isInRestaurantSale(order) {
  return (
    isInRestaurantChannel(order)
    && !['Cancelled', 'Rejected', 'Draft'].includes(order.order_status)
    && String(order.payment_status || '').toLowerCase() !== 'pending'
  );
}

function countsTowardSales(order) {
  return isOnlineDelivered(order) || isInRestaurantSale(order);
}

function salesChannelFor(order) {
  if (isInRestaurantChannel(order)) return 'IN_RESTAURANT';
  return 'ONLINE';
}

function baseOrdersQuery(from, to, filters = {}) {
  let query = db('delivery_orders')
    .where('order_time', '>=', from.toISOString())
    .where('order_time', '<=', to.toISOString());

  if (filters.channel && filters.channel !== 'ALL') {
    query = query.where('order_channel', filters.channel);
  }

  if (filters.subtype && filters.subtype !== 'ALL') {
    query = query.where('order_type', filters.subtype);
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
    const methodMap = {
      cash: ['COD', 'Cash', 'cash'],
      card: ['Card', 'card'],
      online: ['Online', 'online'],
    };
    const methods = methodMap[filters.paymentMethod] || [filters.paymentMethod];
    query = query.whereIn('payment_method', methods);
  }

  return query;
}

function normalizePaymentKey(method) {
  const value = String(method || '').toLowerCase();
  if (value === 'cod' || value === 'cash') return 'cash';
  if (value === 'card') return 'card';
  return 'online';
}

async function getSummary(params = {}) {
  const { from, to, range } = resolveDateRange(params);
  const allOrders = await baseOrdersQuery(from, to, params).select('*');
  const salesOrders = allOrders.filter(countsTowardSales);

  const totalRevenue = salesOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalOrders = salesOrders.length;
  const averageOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  const channels = {
    ONLINE: { revenue: 0, orders: 0, percentage: 0 },
    IN_RESTAURANT: { revenue: 0, orders: 0, percentage: 0 },
  };

  const paymentMethods = { cash: 0, card: 0, online: 0 };

  for (const order of salesOrders) {
    const amount = Number(order.total_amount);
    const channel = salesChannelFor(order);
    channels[channel].revenue += amount;
    channels[channel].orders += 1;
    paymentMethods[normalizePaymentKey(order.payment_method)] += amount;
  }

  for (const key of Object.keys(channels)) {
    channels[key].percentage = totalRevenue
      ? Math.round((channels[key].revenue / totalRevenue) * 1000) / 10
      : 0;
  }

  const cancelledOrders = await db('delivery_orders')
    .where('order_time', '>=', from.toISOString())
    .where('order_time', '<=', to.toISOString())
    .whereIn('order_status', ['Cancelled', 'Rejected'])
    .count('id as count')
    .first();

  const topItems = await getByItem({ ...params, from: from.toISOString(), to: to.toISOString() });

  const activeOrders = allOrders.filter(
    (o) => !['Cancelled', 'Rejected', 'Delivered'].includes(o.order_status),
  );

  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    totalRevenue: Math.round(totalRevenue),
    totalOrders,
    averageOrderValue,
    channels,
    paymentMethods,
    topItems: topItems.slice(0, 5),
    cancelledOrders: Number(cancelledOrders?.count || 0),
    pendingOrders: activeOrders.filter((o) => o.order_status === 'New').length,
    preparingOrders: activeOrders.filter((o) =>
      ['Preparing', 'Rider Assigned', 'Accepted'].includes(o.order_status),
    ).length,
    deliveredToday: allOrders.filter((o) => isOnlineDelivered(o)).length,
    onlineOrders: channels.ONLINE.orders,
    inRestaurantOrders: channels.IN_RESTAURANT.orders,
  };
}

async function getByDay(params = {}) {
  const { from, to } = resolveDateRange(params);
  const days = params.days || (params.range === 'monthly' ? 30 : 14);

  const orders = await baseOrdersQuery(from, to, params).select(
    'order_time',
    'total_amount',
    'order_channel',
    'order_status',
  );

  const buckets = {};
  for (let i = 0; i < days; i += 1) {
    const date = new Date(from);
    date.setDate(from.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    buckets[key] = { date: key, orders: 0, revenue: 0, online: 0, inRestaurant: 0 };
  }

  for (const order of orders) {
    if (!countsTowardSales(order)) continue;

    const key = new Date(order.order_time).toISOString().slice(0, 10);
    if (!buckets[key]) continue;

    const amount = Number(order.total_amount);
    buckets[key].orders += 1;
    buckets[key].revenue += amount;

    if (isInRestaurantChannel(order)) {
      buckets[key].inRestaurant += amount;
    } else {
      buckets[key].online += amount;
    }
  }

  return Object.values(buckets)
    .map((row) => ({
      ...row,
      revenue: Math.round(row.revenue),
      online: Math.round(row.online),
      inRestaurant: Math.round(row.inRestaurant),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function applySalesJoinFilters(query, params, from, to) {
  query
    .where('orders.order_time', '>=', from.toISOString())
    .where('orders.order_time', '<=', to.toISOString())
    .where(function applySalesRules() {
      this.where(function inRestaurantSales() {
        this.where('orders.order_channel', 'IN_RESTAURANT').whereNotIn(
          'orders.order_status',
          ['Cancelled', 'Rejected', 'Draft'],
        ).whereNot('orders.payment_status', 'Pending');
      }).orWhere(function onlineDeliveredSales() {
        this.where(function notInRestaurant() {
          this.where('orders.order_channel', '!=', 'IN_RESTAURANT').orWhereNull(
            'orders.order_channel',
          );
        }).where('orders.order_status', 'Delivered');
      });
    });

  if (params.channel && params.channel !== 'ALL') {
    query.where('orders.order_channel', params.channel);
  }

  if (params.subtype && params.subtype !== 'ALL') {
    query.where('orders.order_type', params.subtype);
  }

  if (params.paymentMethod && params.paymentMethod !== 'ALL') {
    const methodMap = {
      cash: ['COD', 'Cash', 'cash'],
      card: ['Card', 'card'],
      online: ['Online', 'online'],
    };
    const methods = methodMap[params.paymentMethod] || [params.paymentMethod];
    query.whereIn('orders.payment_method', methods);
  }

  return query;
}

async function getByItem(params = {}) {
  const { from, to } = resolveDateRange(params);

  let query = db('delivery_order_items as items')
    .join('delivery_orders as orders', 'items.order_id', 'orders.id')
    .leftJoin('products as products', 'items.product_id', 'products.id')
    .select(
      'items.product_id',
      'items.product_name',
      'products.category_id',
    )
    .sum('items.quantity as quantity')
    .sum('items.total_price as revenue')
    .groupBy('items.product_id', 'items.product_name', 'products.category_id')
    .orderBy('revenue', 'desc');

  applySalesJoinFilters(query, params, from, to);

  const rows = await query;

  return rows.map((row) => ({
    menuItemId: row.product_id,
    name: row.product_name,
    categoryId: row.category_id,
    quantity: Number(row.quantity),
    revenue: Math.round(Number(row.revenue)),
  }));
}

async function getByCategory(params = {}) {
  const { from, to } = resolveDateRange(params);

  let query = db('delivery_order_items as items')
    .join('delivery_orders as orders', 'items.order_id', 'orders.id')
    .join('products as products', 'items.product_id', 'products.id')
    .join('menu_categories as categories', 'products.category_id', 'categories.id')
    .select('categories.id as category_id', 'categories.category_name')
    .countDistinct('orders.id as orders')
    .sum('items.total_price as revenue')
    .groupBy('categories.id', 'categories.category_name')
    .orderBy('revenue', 'desc');

  applySalesJoinFilters(query, params, from, to);

  const rows = await query;
  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue), 0);

  return rows.map((row) => ({
    categoryId: row.category_id,
    name: row.category_name,
    orders: Number(row.orders),
    revenue: Math.round(Number(row.revenue)),
    percentage: totalRevenue
      ? Math.round((Number(row.revenue) / totalRevenue) * 1000) / 10
      : 0,
  }));
}

module.exports = {
  getSummary,
  getByDay,
  getByItem,
  getByCategory,
  countsTowardSales,
  isOnlineDelivered,
  isInRestaurantSale,
};
