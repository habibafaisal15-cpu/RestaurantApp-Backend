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

## Deploy

Designed for Vercel serverless + Neon PostgreSQL. See `backend/.env.example` for required environment variables.
