const { WS_EVENTS } = require('../../../shared/constants/orderStatus');
const { buildCustomerNotification } = require('./orderTimer');

function createCustomerEmit(io) {
  return (event, payload) => {
    io.to('admin:delivery').emit(event, payload);

    if (payload?.tracking_token) {
      io.to(`track:${payload.tracking_token}`).emit(event, payload);
    }

    if (payload?.order_id) {
      io.to(`order:${payload.order_id}`).emit(event, payload);
    }
  };
}

function emitCustomerOrderEvent(emit, event, order, message) {
  const payload = buildCustomerNotification(order, message);
  if (emit) emit(event, payload);
  return payload;
}

function emitTrackingSnapshotToSocket(socket, order) {
  if (!order) return;

  const payload = buildCustomerNotification(order);
  socket.emit(WS_EVENTS.STATUS_CHANGED, payload);

  if (order.order_status === 'Accepted') {
    socket.emit(WS_EVENTS.ORDER_ACCEPTED, {
      ...payload,
      message: `Your order ${order.order_number} has been accepted`,
    });
  } else if (
    ['Preparing', 'Rider Assigned', 'Out for Delivery', 'Delivered'].includes(
      order.order_status,
    )
  ) {
    socket.emit(WS_EVENTS.ORDER_ACCEPTED, {
      ...payload,
      message: `Your order ${order.order_number} has been accepted`,
    });
  }

  if (order.rider_name) {
    socket.emit(WS_EVENTS.RIDER_ASSIGNED, {
      ...payload,
      message: `Rider ${order.rider_name} (${order.rider_phone}) assigned to order ${order.order_number}`,
    });
  }

  if (order.order_status === 'Delivered') {
    socket.emit(WS_EVENTS.DELIVERED, payload);
  }
}

module.exports = {
  createCustomerEmit,
  emitCustomerOrderEvent,
  emitTrackingSnapshotToSocket,
};
