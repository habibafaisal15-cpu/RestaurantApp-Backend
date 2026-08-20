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

async function ensureReportExtrasSchema() {
  const hasCost = await db.schema.hasColumn('products', 'cost_price');
  if (!hasCost) {
    await db.schema.alterTable('products', (table) => {
      table.decimal('cost_price', 10, 2).nullable();
    });
  }

  const hasPayables = await db.schema.hasTable('supplier_payables');
  if (!hasPayables) {
    await db.schema.createTable('supplier_payables', (table) => {
      table.string('id', 36).primary();
      table.string('supplier_name', 120).notNullable();
      table.string('reference', 80).nullable();
      table.decimal('amount', 12, 2).notNullable();
      table.decimal('paid_amount', 12, 2).notNullable().defaultTo(0);
      table.string('status', 20).notNullable().defaultTo('open'); // open | partial | paid
      table.timestamp('due_date').nullable();
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }
}

async function getCustomers(params = {}) {
  const { from, to } = resolveDateRange(params);
  const orders = await baseOrdersQuery(from, to, params).select(
    'customer_name',
    'customer_phone',
    'total_amount',
    'order_status',
    'payment_status',
    'order_channel',
    'order_time',
    'discount',
  );

  const map = new Map();
  for (const order of orders) {
    if (['Cancelled', 'Rejected'].includes(order.order_status)) continue;
    const phone = String(order.customer_phone || '').trim() || 'unknown';
    const key = phone;
    if (!map.has(key)) {
      map.set(key, {
        phone,
        name: order.customer_name || 'Customer',
        orders: 0,
        revenue: 0,
        discounts: 0,
        lastOrderAt: order.order_time,
        channels: { ONLINE: 0, IN_RESTAURANT: 0 },
      });
    }
    const row = map.get(key);
    row.orders += 1;
    if (countsTowardSales(order)) {
      row.revenue += Number(order.total_amount) || 0;
      row.discounts += Number(order.discount) || 0;
    }
    const channel = salesChannelFor(order);
    row.channels[channel] = (row.channels[channel] || 0) + 1;
    if (new Date(order.order_time) > new Date(row.lastOrderAt)) {
      row.lastOrderAt = order.order_time;
      row.name = order.customer_name || row.name;
    }
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      revenue: Math.round(row.revenue),
      discounts: Math.round(row.discounts),
      averageOrder: row.orders ? Math.round(row.revenue / row.orders) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

async function getDailyClosing(params = {}) {
  const { from, to } = resolveDateRange(params);
  const orders = await baseOrdersQuery(from, to, params).select('*');
  const salesOrders = orders.filter(countsTowardSales);

  const paymentMethods = {
    cash: { orders: 0, amount: 0 },
    card: { orders: 0, amount: 0 },
    online: { orders: 0, amount: 0 },
  };
  const channels = {
    ONLINE: { orders: 0, amount: 0 },
    IN_RESTAURANT: { orders: 0, amount: 0 },
  };

  let grossSales = 0;
  let discounts = 0;
  let tax = 0;
  let serviceCharge = 0;
  let deliveryFees = 0;

  for (const order of salesOrders) {
    const amount = Number(order.total_amount) || 0;
    grossSales += amount;
    discounts += Number(order.discount) || 0;
    tax += Number(order.tax_amount) || 0;
    serviceCharge += Number(order.service_charge) || 0;
    deliveryFees += Number(order.delivery_fee) || 0;

    const payKey = normalizePaymentKey(order.payment_method);
    paymentMethods[payKey].orders += 1;
    paymentMethods[payKey].amount += amount;

    const channel = salesChannelFor(order);
    channels[channel].orders += 1;
    channels[channel].amount += amount;
  }

  const cancelled = orders.filter((o) =>
    ['Cancelled', 'Rejected'].includes(o.order_status),
  );
  const openDrafts = orders.filter(
    (o) => o.order_status === 'Draft' || String(o.payment_status).toLowerCase() === 'pending',
  );

  const byDay = await getByDay(params);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    grossSales: Math.round(grossSales),
    netSales: Math.round(grossSales),
    discounts: Math.round(discounts),
    tax: Math.round(tax),
    serviceCharge: Math.round(serviceCharge),
    deliveryFees: Math.round(deliveryFees),
    orderCount: salesOrders.length,
    cancelledCount: cancelled.length,
    cancelledAmount: Math.round(
      cancelled.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
    ),
    openTabsCount: openDrafts.length,
    openTabsAmount: Math.round(
      openDrafts.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
    ),
    paymentMethods: Object.fromEntries(
      Object.entries(paymentMethods).map(([k, v]) => [
        k,
        { orders: v.orders, amount: Math.round(v.amount) },
      ]),
    ),
    channels: Object.fromEntries(
      Object.entries(channels).map(([k, v]) => [
        k,
        { orders: v.orders, amount: Math.round(v.amount) },
      ]),
    ),
    byDay,
  };
}

async function getCreditReport(params = {}) {
  const { from, to } = resolveDateRange(params);
  const orders = await baseOrdersQuery(from, to, params)
    .where(function creditFilter() {
      this.where('order_status', 'Draft').orWhere(function unpaid() {
        this.whereIn('payment_status', ['Pending', 'pending']).whereNotIn('order_status', [
          'Cancelled',
          'Rejected',
          'Delivered',
        ]);
      });
    })
    .select(
      'id',
      'order_number',
      'customer_name',
      'customer_phone',
      'table_number',
      'order_status',
      'payment_status',
      'payment_method',
      'total_amount',
      'order_time',
      'order_type',
      'order_channel',
    )
    .orderBy('order_time', 'desc');

  const rows = orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    tableNumber: order.table_number,
    status: order.order_status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    amount: Math.round(Number(order.total_amount) || 0),
    orderTime: order.order_time,
    type: order.order_type,
    channel: order.order_channel,
    kind: order.order_status === 'Draft' ? 'open_tab' : 'udhaar',
  }));

  const totalOutstanding = rows.reduce((sum, r) => sum + r.amount, 0);

  return {
    totalOutstanding: Math.round(totalOutstanding),
    openTabs: rows.filter((r) => r.kind === 'open_tab').length,
    creditOrders: rows.filter((r) => r.kind === 'udhaar').length,
    rows,
  };
}

function resolveUnitCost(row) {
  const explicit = row.cost_price != null ? Number(row.cost_price) : null;
  if (explicit != null && !Number.isNaN(explicit) && explicit >= 0) {
    return { cost: explicit, estimated: false };
  }
  const price = Number(row.unit_price || row.price || 0);
  return { cost: Math.round(price * 0.4), estimated: true };
}

async function getProfitByProduct(params = {}) {
  await ensureReportExtrasSchema();
  const { from, to } = resolveDateRange(params);

  let query = db('delivery_order_items as items')
    .join('delivery_orders as orders', 'items.order_id', 'orders.id')
    .leftJoin('products as products', 'items.product_id', 'products.id')
    .select(
      'items.product_id',
      'items.product_name',
      'products.cost_price',
      'products.price as product_price',
    )
    .avg('items.unit_price as unit_price')
    .sum('items.quantity as quantity')
    .sum('items.total_price as revenue')
    .groupBy(
      'items.product_id',
      'items.product_name',
      'products.cost_price',
      'products.price',
    )
    .orderBy('revenue', 'desc');

  applySalesJoinFilters(query, params, from, to);
  const rows = await query;

  const mapped = rows.map((row) => {
    const quantity = Number(row.quantity) || 0;
    const revenue = Math.round(Number(row.revenue) || 0);
    const { cost, estimated } = resolveUnitCost({
      cost_price: row.cost_price,
      unit_price: row.unit_price,
      price: row.product_price,
    });
    const cogs = Math.round(cost * quantity);
    const profit = revenue - cogs;
    const margin = revenue ? Math.round((profit / revenue) * 1000) / 10 : 0;
    return {
      menuItemId: row.product_id,
      name: row.product_name,
      quantity,
      revenue,
      unitCost: cost,
      cogs,
      profit,
      margin,
      estimatedCost: estimated,
    };
  });

  const totals = mapped.reduce(
    (acc, row) => {
      acc.revenue += row.revenue;
      acc.cogs += row.cogs;
      acc.profit += row.profit;
      return acc;
    },
    { revenue: 0, cogs: 0, profit: 0 },
  );

  return {
    totals: {
      revenue: Math.round(totals.revenue),
      cogs: Math.round(totals.cogs),
      profit: Math.round(totals.profit),
      margin: totals.revenue
        ? Math.round((totals.profit / totals.revenue) * 1000) / 10
        : 0,
    },
    rows: mapped,
  };
}

async function listPayables(params = {}) {
  await ensureReportExtrasSchema();
  const { from, to } = resolveDateRange(params);
  let query = db('supplier_payables').orderBy('due_date', 'asc');

  if (params.status && params.status !== 'ALL') {
    query = query.where('status', params.status);
  } else {
    query = query.whereIn('status', ['open', 'partial', 'paid']);
  }

  // Include items created in range OR still open regardless of range for usefulness
  const rows = await query;
  const inRange = rows.filter((row) => {
    const created = new Date(row.created_at);
    return created >= from && created <= to;
  });
  const openRows = rows.filter((row) => row.status !== 'paid');
  const list = params.includeOpen === 'false' ? inRange : [
    ...inRange,
    ...openRows.filter((o) => !inRange.some((r) => r.id === o.id)),
  ];

  const mapped = list.map((row) => {
    const amount = Number(row.amount) || 0;
    const paid = Number(row.paid_amount) || 0;
    const balance = Math.max(0, amount - paid);
    return {
      id: row.id,
      supplierName: row.supplier_name,
      reference: row.reference,
      amount: Math.round(amount),
      paidAmount: Math.round(paid),
      balance: Math.round(balance),
      status: row.status,
      dueDate: row.due_date,
      notes: row.notes,
      createdAt: row.created_at,
    };
  });

  const totalOpen = mapped
    .filter((r) => r.status !== 'paid')
    .reduce((sum, r) => sum + r.balance, 0);

  return {
    totalOpen: Math.round(totalOpen),
    count: mapped.length,
    rows: mapped.sort((a, b) => b.balance - a.balance),
  };
}

async function createPayable(payload = {}) {
  await ensureReportExtrasSchema();
  const { generateId } = require('../../utils/helpers');
  const amount = Number(payload.amount);
  if (!payload.supplierName || !(amount > 0)) {
    const { BadRequestError } = require('../../errors/AppError');
    throw new BadRequestError('Supplier name and amount are required');
  }

  const id = generateId();
  const paidAmount = Number(payload.paidAmount || 0);
  let status = 'open';
  if (paidAmount >= amount) status = 'paid';
  else if (paidAmount > 0) status = 'partial';

  await db('supplier_payables').insert({
    id,
    supplier_name: payload.supplierName,
    reference: payload.reference || null,
    amount,
    paid_amount: paidAmount,
    status,
    due_date: payload.dueDate || null,
    notes: payload.notes || null,
  });

  const row = await db('supplier_payables').where({ id }).first();
  return {
    id: row.id,
    supplierName: row.supplier_name,
    reference: row.reference,
    amount: Math.round(Number(row.amount)),
    paidAmount: Math.round(Number(row.paid_amount)),
    balance: Math.round(Number(row.amount) - Number(row.paid_amount)),
    status: row.status,
    dueDate: row.due_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

async function settlePayable(id, payload = {}) {
  await ensureReportExtrasSchema();
  const { NotFoundError, BadRequestError } = require('../../errors/AppError');
  const row = await db('supplier_payables').where({ id }).first();
  if (!row) throw new NotFoundError('Payable not found');

  const amount = Number(row.amount) || 0;
  const nextPaid = Math.min(
    amount,
    Number(payload.paidAmount != null ? payload.paidAmount : amount),
  );
  if (Number.isNaN(nextPaid) || nextPaid < 0) {
    throw new BadRequestError('Invalid paid amount');
  }

  let status = 'open';
  if (nextPaid >= amount) status = 'paid';
  else if (nextPaid > 0) status = 'partial';

  await db('supplier_payables').where({ id }).update({
    paid_amount: nextPaid,
    status,
    updated_at: db.fn.now(),
  });

  const updated = await db('supplier_payables').where({ id }).first();
  return {
    id: updated.id,
    supplierName: updated.supplier_name,
    reference: updated.reference,
    amount: Math.round(Number(updated.amount)),
    paidAmount: Math.round(Number(updated.paid_amount)),
    balance: Math.round(Number(updated.amount) - Number(updated.paid_amount)),
    status: updated.status,
    dueDate: updated.due_date,
    notes: updated.notes,
    createdAt: updated.created_at,
  };
}

module.exports = {
  getSummary,
  getByDay,
  getByItem,
  getByCategory,
  getCustomers,
  getDailyClosing,
  getCreditReport,
  getProfitByProduct,
  listPayables,
  createPayable,
  settlePayable,
  ensureReportExtrasSchema,
  countsTowardSales,
  isOnlineDelivered,
  isInRestaurantSale,
};
