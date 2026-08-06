function createNoopIo() {
  const noop = () => {};
  const room = () => ({ emit: noop, to: () => room() });

  return {
    emit: noop,
    to: room,
  };
}

module.exports = { createNoopIo };
