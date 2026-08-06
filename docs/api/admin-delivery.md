# Admin Delivery API

Backend APIs for the restaurant admin delivery panel. No rider app — admin assigns rider name and phone manually.

## Dashboard (load everything at once)

```
GET /api/v1/delivery/dashboard
GET /api/v1/delivery/dashboard?status=New
GET /api/v1/delivery/dashboard?search=Ayesha
```

**Response:**

```json
{
  "success": true,
  "data": {
    "stats": {
      "new_orders": 8,
      "preparing": 5,
      "out_for_delivery": 6,
      "delivered_today": 23,
      "cancelled": 2
    },
    "overview": {
      "total": 44,
      "breakdown": [
        { "status": "New", "count": 8, "percentage": 18.2 }
      ]
    },
    "orders": [
      {
        "id": "...",
        "order_number": "#DLV-00123",
        "customer_name": "Ayesha Khan",
        "area": "Downtown",
        "order_time_display": "12:30 PM",
        "total_amount": 1650,
        "order_status": "New",
        "item_count": 3
      }
    ]
  }
}
```

## Status counters only

```
GET /api/v1/delivery/summary
```

Returns the `stats` object from the dashboard.

## Order list (sidebar)

```
GET /api/v1/delivery/orders
GET /api/v1/delivery/orders?status=Preparing
GET /api/v1/delivery/orders?search=DLV-00123
```

**Status filter values:** `New`, `Preparing`, `Out for Delivery`, `Delivered`, `Cancelled`

## Order detail (main panel)

```
GET /api/v1/delivery/orders/:id
```

**Response includes:**

- Customer name, phone, address, delivery instructions
- Line items with qty and prices
- Subtotal, delivery fee, discount, total
- Payment method and status
- Order time
- Assigned rider (if any)
- `available_actions` — buttons the admin UI should show

**Example `available_actions` for a New order:**

```json
[
  { "action": "accept", "label": "Accept Order", "next_status": "Accepted" },
  { "action": "reject", "label": "Reject Order", "next_status": "Rejected" }
]
```

## Update order status

```
PATCH /api/v1/delivery/orders/:id/status
```

```json
{
  "status": "Accepted",
  "set_by": "Admin",
  "note": "Optional note"
}
```

**Allowed statuses:** `Accepted`, `Rejected`, `Preparing`, `Out for Delivery`, `Delivered`, `Cancelled`

## Assign rider (manual — admin types name + phone)

```
PATCH /api/v1/delivery/orders/:id/assign-rider
```

```json
{
  "rider_name": "Ali Raza",
  "rider_phone": "+923001234567",
  "set_by": "Admin"
}
```

Order must be `Accepted` or `Preparing`. Sets status to `Rider Assigned` and pushes rider info to the customer tracking page.

## Order tracking timeline

```
GET /api/v1/delivery/orders/:id/tracking
```

## WebSocket (admin panel)

Connect to Socket.io, then emit:

```js
socket.emit('join:admin');
```

**Events to listen for:**

| Event | When |
|-------|------|
| `order.created` | Customer places a new order |
| `order.status_changed` | Any status update |
| `order.rider_assigned` | Admin assigns a rider |
| `order.delivered` | Order marked delivered |

## Menu item availability (admin)

See **[Admin Catalog API](./admin-catalog.md)** for full CRUD: add/edit/delete items, upload images, manage deals, and real-time customer sync.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/delivery/menu/categories` | List menu categories |
| GET | `/api/v1/delivery/menu/items` | List all menu items with availability |
| GET | `/api/v1/delivery/menu/items/:id` | Single item detail |
| POST | `/api/v1/delivery/menu/items` | Create item with optional image |
| PATCH | `/api/v1/delivery/menu/items/:id` | Update item |
| DELETE | `/api/v1/delivery/menu/items/:id` | Delete item |
| PATCH | `/api/v1/delivery/menu/items/:id/availability` | Mark available / unavailable |

### List menu items

```
GET /api/v1/delivery/menu/items
GET /api/v1/delivery/menu/items?category_id={uuid}
GET /api/v1/delivery/menu/items?availability=available
GET /api/v1/delivery/menu/items?availability=out_of_stock
GET /api/v1/delivery/menu/items?availability=unavailable
```

**Item fields:**

| Field | Meaning |
|-------|---------|
| `in_stock` | `false` = out of stock (customer sees item disabled) |
| `available_for_delivery` | `false` = hidden from customer menu |
| `is_active` | `false` = fully disabled |
| `availability_status` | `available`, `out_of_stock`, or `unavailable` |

### Update availability

```
PATCH /api/v1/delivery/menu/items/:id/availability
```

**Mark out of stock:**
```json
{ "in_stock": false }
```

**Mark available again:**
```json
{ "in_stock": true }
```

**Hide from delivery menu:**
```json
{ "available_for_delivery": false }
```

**Restore to delivery menu:**
```json
{ "available_for_delivery": true }
```

**Fully disable item:**
```json
{ "is_active": false }
```

# Order accept + rider assignment timer

When admin **accepts** an order:
- `accepted_at` is set
- `rider_assign_deadline` = accepted_at + **60 seconds**
- Admin order APIs return a `timer` object with `rider_assign_seconds_remaining`
- Customer receives WebSocket `order.accepted` with order number and status

Admin must **assign rider within 60 seconds** or the order is auto-cancelled.

## Customer WebSocket events (tracking page)

Listen on `join:track` with tracking token:

| Event | Customer receives |
|-------|-------------------|
| `order.accepted` | `{ order_number, order_status, message }` |
| `order.status_changed` | `{ order_number, order_status, rider?, message }` |
| `order.rider_assigned` | `{ order_number, order_status, rider: { name, phone }, message }` |
| `order.delivered` | `{ order_number, order_status, message }` |
| `order.rider_assign_expired` | Order auto-cancelled if rider not assigned in time |

Order number (`#DLV-00001`) is assigned **automatically** when the customer places the order.

## Order lifecycle

```
New → Accept → Accepted → Preparing → Assign Rider → Rider Assigned
     → Out for Delivery → Delivered

New → Reject → Rejected
Any active step → Cancel → Cancelled
```
