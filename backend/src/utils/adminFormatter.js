function formatTime(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function extractArea(deliveryAddress, zoneName) {
  if (zoneName) return zoneName;
  if (!deliveryAddress) return '';
  return deliveryAddress.split(',')[0].trim();
}

function paymentLabel(method, status) {
  const labels = {
    COD: 'Cash on Delivery',
    Online: 'Online Payment',
  };
  return {
    method: labels[method] || method,
    status,
    is_paid: status === 'Paid' || status === 'Settled',
  };
}

module.exports = {
  formatTime,
  formatDateTime,
  extractArea,
  paymentLabel,
};
