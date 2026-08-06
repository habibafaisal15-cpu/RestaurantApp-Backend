# Database schema reference

Tables for the delivery module (from workflow spec).

| Table | Purpose |
|-------|---------|
| `delivery_zones` | Service areas, fees, ETA |
| `menu_categories` | Category tabs for customer menu |
| `products` | Menu items (+ `available_for_delivery`, `in_stock`) |
| `delivery_riders` | Saved rider roster |
| `delivery_orders` | Order header, status, rider, payment |
| `delivery_order_items` | Line items per order |
| `order_tracking_logs` | Audit trail of every status change |

Migration files go in `backend/database/migrations/`.
