const ORDER_STATUSES = [
  'New',
  'Accepted',
  'Preparing',
  'Rider Assigned',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Rejected',
];

const STATUS_TRANSITIONS = {
  New: ['Accepted', 'Rejected', 'Cancelled'],
  Accepted: ['Preparing', 'Cancelled'],
  Preparing: ['Rider Assigned', 'Cancelled'],
  'Rider Assigned': ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
  Rejected: [],
};

const ADMIN_ACTIONS = {
  New: [
    { action: 'accept', label: 'Accept Order', next_status: 'Accepted' },
    { action: 'reject', label: 'Reject Order', next_status: 'Rejected' },
  ],
  Accepted: [
    { action: 'assign_rider', label: 'Assign Rider', type: 'assign_rider' },
    { action: 'start_preparing', label: 'Start Preparing', next_status: 'Preparing' },
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  Preparing: [
    { action: 'assign_rider', label: 'Assign Rider', type: 'assign_rider' },
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  'Rider Assigned': [
    { action: 'out_for_delivery', label: 'Out for Delivery', next_status: 'Out for Delivery' },
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  'Out for Delivery': [
    { action: 'deliver', label: 'Mark Delivered', next_status: 'Delivered' },
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  Delivered: [],
  Cancelled: [],
  Rejected: [],
};

const WS_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_ACCEPTED: 'order.accepted',
  STATUS_CHANGED: 'order.status_changed',
  RIDER_ASSIGNED: 'order.rider_assigned',
  DELIVERED: 'order.delivered',
  RIDER_ASSIGN_EXPIRED: 'order.rider_assign_expired',
};

module.exports = {
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
  ADMIN_ACTIONS,
  WS_EVENTS,
};
