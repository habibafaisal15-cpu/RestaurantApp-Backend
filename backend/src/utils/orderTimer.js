const RIDER_ASSIGN_TIMEOUT_SECONDS = 60;

function addSeconds(date, seconds) {
  return new Date(new Date(date).getTime() + seconds * 1000);
}

function buildRiderAssignTimer(order) {
  if (!order.accepted_at || !order.rider_assign_deadline) {
    return null;
  }

  if (order.rider_name || !['Accepted', 'Preparing'].includes(order.order_status)) {
    return {
      accepted_at: order.accepted_at,
      rider_assign_deadline: order.rider_assign_deadline,
      rider_assign_seconds_total: RIDER_ASSIGN_TIMEOUT_SECONDS,
      rider_assign_seconds_remaining: 0,
      rider_assign_expired: false,
      rider_assigned: true,
    };
  }

  const deadlineMs = new Date(order.rider_assign_deadline).getTime();
  const remainingMs = deadlineMs - Date.now();
  const secondsRemaining = Math.max(0, Math.ceil(remainingMs / 1000));

  return {
    accepted_at: order.accepted_at,
    rider_assign_deadline: order.rider_assign_deadline,
    rider_assign_seconds_total: RIDER_ASSIGN_TIMEOUT_SECONDS,
    rider_assign_seconds_remaining: secondsRemaining,
    rider_assign_expired: remainingMs <= 0,
    rider_assigned: false,
  };
}

function buildCustomerNotification(order, message) {
  return {
    order_id: order.id,
    order_number: order.order_number,
    order_status: order.order_status,
    tracking_token: order.tracking_token,
    rider: order.rider_name
      ? { name: order.rider_name, phone: order.rider_phone }
      : null,
    message: message || statusMessage(order.order_status, order.order_number),
  };
}

function statusMessage(status, orderNumber) {
  const messages = {
    New: `Order ${orderNumber} received`,
    Accepted: `Order ${orderNumber} has been accepted`,
    Preparing: `Order ${orderNumber} is being prepared`,
    'Rider Assigned': `A rider has been assigned to order ${orderNumber}`,
    'Out for Delivery': `Order ${orderNumber} is out for delivery`,
    Delivered: `Order ${orderNumber} has been delivered`,
    Cancelled: `Order ${orderNumber} was cancelled`,
    Rejected: `Order ${orderNumber} was rejected`,
  };
  return messages[status] || `Order ${orderNumber} status: ${status}`;
}

module.exports = {
  RIDER_ASSIGN_TIMEOUT_SECONDS,
  addSeconds,
  buildRiderAssignTimer,
  buildCustomerNotification,
  statusMessage,
};
