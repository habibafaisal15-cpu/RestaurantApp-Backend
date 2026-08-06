FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend --omit=dev

COPY backend ./backend
COPY shared ./shared

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "backend/src/server.js"]
