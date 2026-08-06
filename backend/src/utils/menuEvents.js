const { MENU_WS_EVENTS } = require('../../../shared/constants/menuEvents');

function createMenuEmit(io) {
  return (event, payload) => {
    if (!io) return;
    io.emit(event, payload);
    io.to('storefront:menu').emit(event, payload);
  };
}

module.exports = {
  MENU_WS_EVENTS,
  createMenuEmit,
};
