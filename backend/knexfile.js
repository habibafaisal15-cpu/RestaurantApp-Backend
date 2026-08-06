require('dotenv').config();

const client = process.env.DB_CLIENT || 'pg';

const pgConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'restaurant_delivery',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './database/migrations',
  },
  seeds: {
    directory: './database/seeds',
  },
};

const sqliteConfig = {
  client: 'sqlite3',
  connection: {
    filename: process.env.DB_FILENAME || './database/restaurant.db',
  },
  useNullAsDefault: true,
  migrations: {
    directory: './database/migrations',
  },
  seeds: {
    directory: './database/seeds',
  },
};

module.exports = client === 'sqlite3' ? sqliteConfig : pgConfig;
