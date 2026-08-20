const db = require('../../config/database');
const { emitTrackingSnapshotToSocket } = require('../../utils/customerEvents');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join:admin', () => {
      socket.join('admin:delivery');
    });

    socket.on('join:kitchen', () => {
      socket.join('kitchen:orders');
    });

    socket.on('join:rider', ({ phone }) => {
      if (phone) socket.join(`rider:${phone}`);
    });

    socket.on('join:track', async ({ token }) => {
      if (!token) return;

      socket.join(`track:${token}`);

      try {
        const order = await db('delivery_orders')
          .where({ tracking_token: token })
          .first();

        emitTrackingSnapshotToSocket(socket, order);
      } catch (error) {
        console.error('Failed to sync tracking socket state:', error.message);
      }
    });

    socket.on('join:order', ({ order_id: orderId }) => {
      if (orderId) socket.join(`order:${orderId}`);
    });

    socket.on('join:menu', () => {
      socket.join('storefront:menu');
    });

    socket.on('disconnect', () => {});
  });
}

module.exports = { registerSocketHandlers };
