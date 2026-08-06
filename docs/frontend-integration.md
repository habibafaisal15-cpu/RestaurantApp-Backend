# Frontend Integration Guide

Two separate frontend clones from **https://github.com/Maseera14/resturant** — both gitignored and easy to delete.

| Folder | Git branch | URL (dev) |
|--------|------------|-------------|
| `resturant-frontend/` | `frontend` | http://localhost:5173 |
| `resturant-admin-frontend/` | `adminfrontend` | http://localhost:5174 |

---

## Customer frontend (`resturant-frontend`)

`resturant-frontend/.env`:

```env
VITE_API_BASE_URL=/api/v1
VITE_API_ORIGIN=
VITE_WS_URL=
```

Vite proxy (`vite.config.js`) forwards:

- `/api/*` → backend REST API
- `/uploads/*` → product/deal images
- `/socket.io` → WebSocket (menu + order updates)

## What is wired to the backend

| Frontend feature | Backend endpoint |
|------------------|------------------|
| Location / zone check | `POST /storefront/location/select-live` |
| Live menu + deal pricing | `GET /storefront/menu?zone_id=` |
| Home top deals + promotions | Same menu endpoint (`deals` array) |
| Real-time menu/deals refresh | WebSocket `join:menu` + `menu.*` events |
| Place order (real zone_id) | `POST /storefront/orders` |
| Track order + live rider | `GET /track/:token` + WebSocket `join:track` |
| Rider popup after checkout | Polls tracking API until admin assigns rider |

Integration adapters live in `resturant-frontend/src/api/`:

- `adapters.js` — maps backend shapes → UI shapes
- `menu.js`, `branches.js`, `orders.js`, `socket.js` — call backend storefront APIs
- `hooks/useDeals.js`, `hooks/useMenu.js`, `hooks/useOrderTracking.js` — live data + WebSocket refresh

**Note:** `branch.id` in the frontend is the backend `zone_id` (stored in `localStorage` as `selected_branch_id`).

Checkout always validates delivery through the backend (no mock `main-branch` zone). Card/wallet payment is still frontend-only until a payment API exists.

## Run all three for testing

```powershell
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — customer frontend
cd resturant-frontend
npm run dev

# Terminal 3 — admin frontend
cd resturant-admin-frontend-new
npm run dev
```

---

## Admin frontend (`resturant-admin-frontend-new`)

Clone the latest `adminfrontend` branch:

```powershell
git clone --branch adminfrontend --single-branch https://github.com/Maseera14/resturant.git resturant-admin-frontend-new
cd resturant-admin-frontend-new
npm install
copy .env.example .env
npm run dev
```

Runs at **http://localhost:5174** with Vite proxy to backend `:3000`.

> **Note:** If an old `resturant-admin-frontend/` folder exists (broken/partial), stop any dev server and remove it, then rename `resturant-admin-frontend-new` → `resturant-admin-frontend`.

### Admin login

- **Email:** `admin@restaurant.com`
- **Password:** `Admin@123`

### Wired to backend

| Admin feature | Backend endpoint |
|---------------|------------------|
| Login / session | `POST /auth/login`, `GET /auth/me` |
| Dashboard + reports | `GET /sales/summary`, `/sales/by-*` |
| Online orders pipeline | `GET /delivery/orders`, status/assign-rider |
| POS walk-in | `POST /orders/walk-in` |
| Menu items CRUD | `/delivery/menu/items` |
| Categories CRUD | `/delivery/menu/categories` |
| Marketing deals | `/admin/deals` |
| Hero slides + side cards | `/hero`, `/hero/slides`, `/hero/side-cards` |
| Riders CRUD | `/delivery/riders` |
| Settings | `GET/PUT /settings` |
| Slips | `/slips/*` |
| Live updates | WebSocket `join:admin` |

Integration layer: `src/api/adapters.js`, `src/api/socket.js`, updated services.

Set `VITE_USE_MOCK=false` in `.env` for live API (default in `.env.example`).

---

## Delete clones after testing

```powershell
Remove-Item -Recurse -Force resturant-frontend
Remove-Item -Recurse -Force resturant-admin-frontend
```

See also: `docs/api/admin-catalog.md`, `docs/api/admin-delivery.md`, `docs/api/admin-auth.md`
