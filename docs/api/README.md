# API Reference

Full spec from the POS Delivery Module workflow document.

## Storefront (Customer)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/storefront/check-location` | Match location to delivery zone |
| GET | `/api/v1/storefront/maps/config` | Google Maps config for frontend |
| POST | `/api/v1/storefront/location/select-live` | GPS / map pin → zone check |
| POST | `/api/v1/storefront/location/reverse-geocode` | Coordinates → address |
| POST | `/api/v1/storefront/location/geocode` | Address → coordinates |
| POST | `/api/v1/storefront/location/place` | Place ID → coordinates |
| GET | `/api/v1/storefront/location/autocomplete` | Address search suggestions |
| GET | `/api/v1/storefront/menu` | Categories + items + deals for zone |
| POST | `/api/v1/storefront/orders` | Create order (status = New) |
| GET | `/api/v1/track/:token` | Public tracking (status, rider, ETA) |

## Delivery (Restaurant Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/delivery/dashboard` | Stats + overview + order list |
| GET | `/api/v1/delivery/summary` | Status count KPIs |
| GET | `/api/v1/delivery/orders` | List with filters |
| GET | `/api/v1/delivery/orders/:id` | Full order detail + actions |
| PATCH | `/api/v1/delivery/orders/:id/status` | Accept / Reject / Preparing / … |
| PATCH | `/api/v1/delivery/orders/:id/assign-rider` | Manual rider name + phone |
| GET | `/api/v1/delivery/orders/:id/tracking` | Status timeline |
| GET | `/api/v1/delivery/menu/categories` | Menu categories |
| GET | `/api/v1/delivery/menu/items` | All menu items + availability |
| POST | `/api/v1/delivery/menu/items` | Create item with image |
| PATCH | `/api/v1/delivery/menu/items/:id` | Update item |
| DELETE | `/api/v1/delivery/menu/items/:id` | Delete item |
| PATCH | `/api/v1/delivery/menu/items/:id/availability` | Toggle available/unavailable |
| GET/POST/PATCH/DELETE | `/api/v1/delivery/deals` | Manage promotional deals |

See [admin-delivery.md](./admin-delivery.md) for order panel integration and [admin-catalog.md](./admin-catalog.md) for menu/deals CRUD.

## WebSocket events

| Event | Payload highlights |
|-------|-------------------|
| `order.created` | Full order object for admin panel |
| `order.status_changed` | `order_id`, `status`, `eta` |
| `order.rider_assigned` | `order_id`, `rider_name`, `rider_phone` |
| `order.delivered` | `order_id`, `total_amount` |
| `menu.updated` | Catalog change — refetch storefront menu |
| `menu.item_created` / `menu.item_updated` / `menu.item_deleted` | Menu item changes |
| `menu.deal_created` / `menu.deal_updated` / `menu.deal_deleted` | Deal changes |

Admin panel: emit `join:admin` on connect.
Customer menu: emit `join:menu` on connect.
