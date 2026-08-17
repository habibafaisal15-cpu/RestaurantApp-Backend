const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { port } = require('./config/env');
const { registerSocketHandlers } = require('./websocket/handlers/socketHandlers');
const deliveryService = require('./services/delivery/deliveryService');
const { createCustomerEmit } = require('./utils/customerEvents');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

app.set('io', io);
registerSocketHandlers(io);

function createEmit() {
  return createCustomerEmit(io);
}

setInterval(async () => {
  try {
    await deliveryService.expireUnassignedOrders(createEmit());
  } catch (err) {
    console.error('Failed to expire unassigned orders:', err.message);
  }
}, 5000);

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`API: http://localhost:${port}/api/v1/health`);

  const inventoryService = require('./services/admin/inventoryService');
  inventoryService.ensureInventorySchema().catch((err) => {
    console.error('Inventory schema setup failed:', err.message);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other backend process and restart.`);
    process.exit(1);
  }
  throw err;
});

module.exports = { io, createCustomerEmit };
