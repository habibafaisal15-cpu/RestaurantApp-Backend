# Admin CMS, POS, Slips & Sales API

JWT-protected admin endpoints for settings, hero CMS, order slips, sales reports, riders, and walk-in POS orders.

Base path: `/api/v1`

## Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings` | Get restaurant settings |
| PUT | `/settings` | Update settings (partial) |

Settings include: `restaurantName`, `tagline`, `logo`, contact info, tax/service charge percentages, delivery fee, opening hours, slip options, announcements.

## Hero CMS

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hero` | Get hero content (slides from categories + side cards + top deals) |
| PUT | `/hero` | Update hero content |
| PUT | `/hero/side-cards` | Update side cards (`{ sideCards: [...] }`) |
| PUT | `/hero/top-deals` | Update top deals (`{ topDeals: [...] }`) |

Hero slides are built from menu categories with `show_in_hero: true`. Category hero fields: `description`, `image_url`, `hero_image_url`, `hero_title`, `show_in_hero`.

## Order Slips

| Method | Path | Description |
|--------|------|-------------|
| POST | `/slips/generate` | Generate slip `{ orderId, slipType }` |
| GET | `/slips` | List slips (filters: `orderId`, `slipType`, `from`, `to`) |
| GET | `/slips/order/:orderId` | Slips for an order |
| POST | `/slips/:id/reprint` | Reprint slip |

## Sales Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sales/summary` | Revenue summary (`range`, `from`, `to`, `channel`, `paymentMethod`) |
| GET | `/sales/by-item` | Sales by menu item |
| GET | `/sales/by-category` | Sales by category |
| GET | `/sales/by-day` | Daily breakdown |

## Riders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/delivery/riders` | List riders |
| GET | `/delivery/riders/:id` | Get rider |
| POST | `/delivery/riders` | Create rider |
| PATCH | `/delivery/riders/:id` | Update rider |
| PATCH | `/delivery/riders/:id/toggle-active` | Toggle active status |

## Walk-in POS

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orders/walk-in` | Create in-restaurant order |

Request body:

```json
{
  "type": "DINE_IN",
  "items": [{ "menuItemId": "<uuid>", "quantity": 2, "notes": "" }],
  "customer": { "name": "Guest", "phone": "" },
  "tableNumber": "12",
  "paymentMethod": "cash",
  "paymentStatus": "paid",
  "cashierName": "Admin"
}
```

Walk-in orders use `order_channel: IN_RESTAURANT`, auto-generate token numbers, and optionally auto-create kitchen slips when `autoSlipWalkIn` is enabled in settings.

## Response format

All endpoints return:

```json
{ "success": true, "data": { ... } }
```
