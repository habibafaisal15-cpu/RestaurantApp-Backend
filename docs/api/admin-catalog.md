# Admin Catalog API

Protected admin APIs for managing menu items, categories, deals, and product images. Changes broadcast instantly to customer apps via WebSocket.

**Auth:** All endpoints require `Authorization: Bearer <admin_jwt>`.

---

## Menu categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/delivery/menu/categories` | List all categories |
| POST | `/api/v1/delivery/menu/categories` | Create category |
| PATCH | `/api/v1/delivery/menu/categories/:id` | Update category |

**Create category (JSON):**

```json
{
  "category_name": "Burgers",
  "display_order": 1,
  "is_active": true
}
```

---

## Menu items

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/delivery/menu/items` | List all items |
| GET | `/api/v1/delivery/menu/items/:id` | Single item |
| POST | `/api/v1/delivery/menu/items` | Create item (with optional image) |
| PATCH | `/api/v1/delivery/menu/items/:id` | Update item (with optional image) |
| DELETE | `/api/v1/delivery/menu/items/:id` | Delete item |
| PATCH | `/api/v1/delivery/menu/items/:id/availability` | Quick availability toggle |

### Create item with image upload

Use `multipart/form-data`:

| Field | Type | Required |
|-------|------|----------|
| `name` | string | yes |
| `category_id` | uuid | yes |
| `price` | number | yes |
| `description` | string | no |
| `image` | file | no (max 5 MB, images only) |
| `image_url` | url | no (alternative to file upload) |
| `in_stock` | boolean | no (default `true`) |
| `available_for_delivery` | boolean | no (default `true`) |
| `is_active` | boolean | no (default `true`) |

**Example (curl):**

```bash
curl -X POST http://localhost:3000/api/v1/delivery/menu/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Chicken Burger" \
  -F "category_id=CATEGORY_UUID" \
  -F "price=850" \
  -F "description=Grilled chicken patty" \
  -F "image=@/path/to/burger.jpg"
```

Uploaded images are served at `/uploads/products/{filename}`.

### Update item

Same fields as create (all optional). Send `multipart/form-data` to replace the image, or JSON for text-only updates.

### Delete item

```
DELETE /api/v1/delivery/menu/items/:id
```

Removes the item and its locally stored image file.

---

## Deals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/delivery/deals` | List all deals |
| GET | `/api/v1/delivery/deals?active_only=true` | Active deals only |
| GET | `/api/v1/delivery/deals/:id` | Single deal |
| POST | `/api/v1/delivery/deals` | Create deal |
| PATCH | `/api/v1/delivery/deals/:id` | Update deal |
| DELETE | `/api/v1/delivery/deals/:id` | Delete deal |

### Create deal

Use `multipart/form-data` or JSON:

| Field | Type | Required |
|-------|------|----------|
| `title` | string | yes |
| `discount_type` | `percentage` or `fixed` | yes |
| `discount_value` | number | yes |
| `description` | string | no |
| `image` | file | no |
| `image_url` | url | no |
| `product_ids` | uuid[] or JSON string | no — omit or `null` for all products |
| `starts_at` | ISO datetime | no |
| `ends_at` | ISO datetime | no |
| `is_active` | boolean | no (default `true`) |

**Example — 20% off all items:**

```json
{
  "title": "Weekend Special",
  "discount_type": "percentage",
  "discount_value": 20
}
```

**Example — Rs. 100 off specific products:**

```json
{
  "title": "Burger Deal",
  "discount_type": "fixed",
  "discount_value": 100,
  "product_ids": ["product-uuid-1", "product-uuid-2"]
}
```

---

## Customer menu (public)

```
GET /api/v1/storefront/menu?zone_id={uuid}
```

**Response now includes deals and per-item deal pricing:**

```json
{
  "success": true,
  "data": {
    "zone_id": "...",
    "categories": [
      {
        "id": "...",
        "category_name": "Burgers",
        "items": [
          {
            "id": "...",
            "name": "Chicken Burger",
            "price": 850,
            "deal_price": 680,
            "deal": {
              "id": "...",
              "title": "Weekend Special",
              "discount_type": "percentage",
              "discount_value": 20
            },
            "image_url": "/uploads/products/abc.jpg",
            "in_stock": true,
            "available_for_delivery": true
          }
        ]
      }
    ],
    "deals": [
      {
        "id": "...",
        "title": "Weekend Special",
        "discount_type": "percentage",
        "discount_value": 20,
        "product_ids": null,
        "image_url": "/uploads/deals/deal.jpg"
      }
    ]
  }
}
```

When multiple deals apply to one item, the best discount (highest savings) is used.

---

## WebSocket — instant customer updates

Customer app should connect to Socket.io and emit:

```js
socket.emit('join:menu');
```

**Events emitted on catalog changes:**

| Event | When |
|-------|------|
| `menu.item_created` | Admin adds a menu item |
| `menu.item_updated` | Admin updates item or availability |
| `menu.item_deleted` | Admin deletes an item |
| `menu.deal_created` | Admin adds a deal |
| `menu.deal_updated` | Admin updates a deal |
| `menu.deal_deleted` | Admin deletes a deal |
| `menu.updated` | Any catalog change (includes `action` field) |

**Recommended customer flow:** On any `menu.*` event, re-fetch `GET /storefront/menu?zone_id=...` to refresh the menu.

**Example payload:**

```json
{
  "action": "item_created",
  "item": {
    "id": "...",
    "name": "Chicken Burger",
    "price": 850,
    "image_url": "/uploads/products/abc.jpg"
  }
}
```
