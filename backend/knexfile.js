require('dotenv').config();

const client = process.env.DB_CLIENT || 'pg';

function buildPgConnection() {
  const connection = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'restaurant_delivery',
  };

  const host = String(connection.host || '');
  if (
    host.includes('neon.tech')
    || host.includes('supabase.co')
    || host.includes('supabase.com')
    || process.env.DB_SSL === 'true'
  ) {
    connection.ssl = { rejectUnauthorized: false };
  }

  return connection;
}

const pgConfig = {
  client: 'pg',
  connection: buildPgConnection(),
  pool: {
    min: 0,
    max: 10,
    // Fail fast instead of hanging login/API when DB is saturated.
    acquireTimeoutMillis: 10000,
    createTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
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
