# Backend

Node.js REST API + WebSocket server for the delivery module.

## Setup

```bash
cd backend
cp .env.example .env      # Windows: copy .env.example .env
npm install

# Start PostgreSQL (Docker)
npm run db:up

# Wait ~5s for Postgres to be ready, then:
npm run setup             # migrate + seed
npm run dev               # http://localhost:3000
```

### Without Docker

Install PostgreSQL locally, create the database, then:

```sql
CREATE DATABASE restaurant_delivery;
```

Update credentials in `.env` if needed, then run `npm run setup`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload |
| `npm start` | Production start |
| `npm run migrate` | Run migrations |
| `npm run seed` | Seed sample data |
| `npm run db:up` | Start PostgreSQL via Docker |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:reset` | Roll back all migrations and re-seed |

## Sample seed data

- **Zone:** Downtown (pincodes `54000`, `54001`, `54002`)
- **Categories:** Starters, Mains, Beverages
- **Riders:** Ahmed Khan, Usman Ali

## API routes (v1)

### Storefront (customer app)

| Method | Route |
|--------|-------|
| POST | `/api/v1/storefront/check-location` |
| GET | `/api/v1/storefront/maps/config` |
| POST | `/api/v1/storefront/location/select-live` |
| POST | `/api/v1/storefront/location/reverse-geocode` |
| POST | `/api/v1/storefront/location/geocode` |
| POST | `/api/v1/storefront/location/place` |
| GET | `/api/v1/storefront/location/autocomplete` |
| GET | `/api/v1/storefront/menu?zone_id=…` |
| POST | `/api/v1/storefront/orders` |

### Track (public)

| Method | Route |
|--------|-------|
| GET | `/api/v1/track/:token` |

### Auth (admin)

| Method | Route |
|--------|-------|
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/forgot-password` |
| POST | `/api/v1/auth/reset-password` |
| GET | `/api/v1/auth/me` |
| POST | `/api/v1/auth/change-password` |

See `docs/api/admin-auth.md`.

### Delivery (restaurant admin — requires token)

| Method | Route |
|--------|-------|
| GET | `/api/v1/delivery/dashboard` |
| GET | `/api/v1/delivery/summary` |
| GET | `/api/v1/delivery/orders` |
| GET | `/api/v1/delivery/orders/:id` |
| PATCH | `/api/v1/delivery/orders/:id/status` |
| PATCH | `/api/v1/delivery/orders/:id/assign-rider` |
| GET | `/api/v1/delivery/orders/:id/tracking` |
| GET | `/api/v1/delivery/menu/categories` |
| GET | `/api/v1/delivery/menu/items` |
| GET | `/api/v1/delivery/menu/items/:id` |
| PATCH | `/api/v1/delivery/menu/items/:id/availability` |

See `docs/api/admin-delivery.md` for full admin panel API docs.

## WebSocket events

Connect via Socket.io. Join rooms with:

- `join:track` → `{ token }` — customer tracking page
- `join:order` → `{ order_id }` — admin order detail

| Event | When |
|-------|------|
| `order.created` | Customer places new order (admin panel) |
| `order.rider_assigned` | Rider attached to order |
| `order.delivered` | Order marked delivered |

## Quick test (curl)

```bash
# Check location
curl -X POST http://localhost:3000/api/v1/storefront/check-location \
  -H "Content-Type: application/json" \
  -d '{"pincode":"54000"}'

# Get menu (use zone id from above)
curl "http://localhost:3000/api/v1/storefront/menu?zone_id=YOUR_ZONE_ID"

# Delivery summary (admin)
curl http://localhost:3000/api/v1/delivery/summary
```

## Database

**PostgreSQL** is the default. Connection settings live in `.env`:

```
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=restaurant_delivery
```

Use `docker-compose.yml` for a local Postgres instance (`npm run db:up`).

To use SQLite instead, set `DB_CLIENT=sqlite3` in `.env` and install `sqlite3` (`npm install sqlite3`).
