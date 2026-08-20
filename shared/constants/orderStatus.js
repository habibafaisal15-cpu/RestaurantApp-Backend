const ORDER_STATUSES = [
  'Draft',
  'New',
  'Accepted',
  'Sent to Kitchen',
  'Preparing',
  'Order Prepared',
  'Rider Assigned',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Rejected',
];

const STATUS_TRANSITIONS = {
  Draft: ['Preparing', 'Delivered', 'Cancelled'],
  New: ['Accepted', 'Rejected', 'Cancelled'],
  Accepted: ['Sent to Kitchen', 'Cancelled'],
  'Sent to Kitchen': ['Preparing', 'Cancelled'],
  Preparing: ['Order Prepared', 'Cancelled'],
  'Order Prepared': ['Rider Assigned', 'Out for Delivery', 'Cancelled'],
  'Rider Assigned': ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
  Rejected: [],
};

const ADMIN_ACTIONS = {
  Draft: [
    { action: 'request_bill', label: 'Request Bill', next_status: 'Delivered' },
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  New: [
    { action: 'accept', label: 'Accept Order', next_status: 'Accepted' },
    { action: 'reject', label: 'Reject Order', next_status: 'Rejected' },
  ],
  Accepted: [
    { action: 'assign_rider', label: 'Assign Rider', type: 'assign_rider' },
    { action: 'send_to_kitchen', label: 'Send to Kitchen', next_status: 'Sent to Kitchen' },
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  'Sent to Kitchen': [
    { action: 'assign_rider', label: 'Assign Rider', type: 'assign_rider' },
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  Preparing: [
    { action: 'assign_rider', label: 'Assign Rider', type: 'assign_rider' },
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  'Order Prepared': [
    { action: 'assign_rider', label: 'Assign Rider', type: 'assign_rider' },
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  'Rider Assigned': [
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  'Out for Delivery': [
    { action: 'cancel', label: 'Cancel Order', next_status: 'Cancelled' },
  ],
  Delivered: [],
  Cancelled: [],
  Rejected: [],
};

const KITCHEN_ACTIONS = {
  'Sent to Kitchen': [
    { action: 'start_preparing', label: 'Start Preparing', next_status: 'Preparing' },
  ],
  Preparing: [
    { action: 'order_prepared', label: 'Order Prepared', next_status: 'Order Prepared' },
  ],
};

const RIDER_ACTIONS = {
  'Order Prepared': [
    { action: 'out_for_delivery', label: 'On the Way', next_status: 'Out for Delivery' },
  ],
  'Rider Assigned': [
    { action: 'out_for_delivery', label: 'On the Way', next_status: 'Out for Delivery' },
  ],
  'Out for Delivery': [
    { action: 'deliver', label: 'Mark Delivered', next_status: 'Delivered' },
  ],
};

const WS_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_ACCEPTED: 'order.accepted',
  STATUS_CHANGED: 'order.status_changed',
  SENT_TO_KITCHEN: 'order.sent_to_kitchen',
  ORDER_PREPARED: 'order.prepared',
  RIDER_ASSIGNED: 'order.rider_assigned',
  DELIVERED: 'order.delivered',
  RIDER_ASSIGN_EXPIRED: 'order.rider_assign_expired',
};

module.exports = {
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
  ADMIN_ACTIONS,
  KITCHEN_ACTIONS,
  RIDER_ACTIONS,
  WS_EVENTS,
};
