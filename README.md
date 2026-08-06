# Restaurant Delivery API

Node.js REST API + WebSocket backend for the restaurant delivery system.

## Structure

```
backend/   Express API, migrations, seeds
shared/    Shared constants (order status, menu events)
```

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in Neon / JWT vars
npm run migrate
npm run seed
npm run dev
```

Health check: `GET /api/v1/health`

## Deploy on Railway

1. Connect repo [RestaurantApp-Backend](https://github.com/habibafaisal15-cpu/RestaurantApp-Backend) on [Railway](https://railway.app)
2. Add environment variables (Neon `DB_*`, `JWT_SECRET`, etc.) — see `backend/.env.example`
3. Railway sets `PORT` automatically; WebSockets work on the same service
4. Run migrations once: `cd backend && npm run migrate && npm run seed` (against Neon from your PC)
5. Health check: `GET /api/v1/health`

Root `npm start` runs `backend/src/server.js` (full Express + Socket.IO).

## Deploy on Vercel (optional / legacy)

Serverless setup via `api/index.js` and `vercel.json` — WebSockets are not supported there.
Prefer Railway for the API.
