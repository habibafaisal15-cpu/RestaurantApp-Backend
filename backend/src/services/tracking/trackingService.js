const db = require('../../config/database');
const { NotFoundError } = require('../../errors/AppError');
const { buildRiderAssignTimer, buildCustomerNotification } = require('../../utils/orderTimer');

async function getTrackingByToken(token) {
  const order = await db('delivery_orders').where({ tracking_token: token }).first();
  if (!order) throw new NotFoundError('Order not found');

  const items = await db('delivery_order_items').where({ order_id: order.id });
  const logs = await db('order_tracking_logs')
    .where({ order_id: order.id })
    .orderBy('logged_at', 'asc');

  const notification = buildCustomerNotification(order);

  return {
    order_number: order.order_number,
    order_status: order.order_status,
    customer_name: order.customer_name,
    delivery_address: order.delivery_address,
    eta: order.eta || order.estimated_delivery_time,
    rider: order.rider_name
      ? {
          name: order.rider_name,
          phone: order.rider_phone,
        }
      : null,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    subtotal: Number(order.subtotal),
    delivery_fee: Number(order.delivery_fee),
    discount: Number(order.discount),
    total_amount: Number(order.total_amount),
    items: items.map((item) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
    })),
    timeline: logs.map((log) => ({
      status: log.status,
      note: log.note,
      logged_at: log.logged_at,
    })),
    notification,
    timer: buildRiderAssignTimer(order),
  };
}

module.exports = { getTrackingByToken };
