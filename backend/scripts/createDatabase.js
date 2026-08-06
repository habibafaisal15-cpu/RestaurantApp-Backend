/**
 * Creates the PostgreSQL database if it does not exist.
 * Run once before migrations: npm run db:create
 */
require('dotenv').config();
const { Client } = require('pg');

async function createDatabase() {
  const dbName = process.env.DB_NAME || 'restaurant_delivery';

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  await client.connect();

  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database "${dbName}" created.`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }

  await client.end();
}

createDatabase().catch((err) => {
  console.error('Failed to create database:', err.message);
  process.exit(1);
});
