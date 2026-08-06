const { v4: uuidv4 } = require('uuid');

const IN_STORE_ZONE_ID = 'a0000000-0000-4000-8000-000000000001';
const SETTINGS_ID = 'default';
const HERO_ID = 'default';

const DEFAULT_SETTINGS = {
  restaurantName: 'Your Kitchen',
  tagline: 'Authentic flavors, delivered fresh',
  logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
  phone: '+92 21 34567890',
  email: 'hello@yourkitchen.com',
  address: 'Block 5, Clifton, Karachi',
  taxPercent: 5,
  serviceChargePercent: 3,
  deliveryFee: 150,
  currency: 'PKR',
  isOpen: true,
  announcement: 'Free delivery on orders above Rs 2,000 this weekend!',
  slipFooter: 'Thank you for choosing Your Kitchen. Visit again!',
  autoSlipWalkIn: true,
  autoSlipOnlineAccept: true,
  openingHours: {
    monday: { open: '11:00', close: '23:30', closed: false },
    tuesday: { open: '11:00', close: '23:30', closed: false },
    wednesday: { open: '11:00', close: '23:30', closed: false },
    thursday: { open: '11:00', close: '23:30', closed: false },
    friday: { open: '11:00', close: '00:30', closed: false },
    saturday: { open: '11:00', close: '00:30', closed: false },
    sunday: { open: '12:00', close: '23:00', closed: false },
  },
};

const DEFAULT_HERO = {
  sideCards: [
    {
      id: 'side-001',
      title: 'Full Menu',
      subtitle: 'Browse all categories',
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      link: '/menu',
      sortOrder: 1,
    },
    {
      id: 'side-002',
      title: 'Best Sellers',
      subtitle: 'Customer favorites',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
      link: '/menu?filter=bestseller',
      sortOrder: 2,
    },
    {
      id: 'side-003',
      title: 'Top Deal',
      subtitle: 'Limited time offers',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
      link: '/deals',
      sortOrder: 3,
    },
  ],
  topDeals: [],
};

/**
 * Admin CMS, POS, slips, and reporting schema extensions.
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('app_settings', (table) => {
    table.string('id', 36).primary();
    table.jsonb('settings').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('hero_content', (table) => {
    table.string('id', 36).primary();
    table.jsonb('content').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('order_slips', (table) => {
    table.string('id', 36).primary();
    table
      .string('order_id', 36)
      .notNullable()
      .references('id')
      .inTable('delivery_orders')
      .onDelete('CASCADE');
    table.string('order_number', 20).notNullable();
    table.string('slip_type', 20).notNullable().defaultTo('kitchen');
    table.string('token_number', 20);
    table.string('table_number', 20);
    table.jsonb('items').notNullable();
    table.string('customer_name', 100).notNullable();
    table.string('channel', 30).notNullable();
    table.string('order_type', 30).notNullable();
    table.string('payment_method', 20).notNullable();
    table.string('payment_status', 20).notNullable();
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('tax', 10, 2).notNullable().defaultTo(0);
    table.decimal('service_charge', 10, 2).notNullable().defaultTo(0);
    table.decimal('total', 10, 2).notNullable();
    table.text('footer');
    table.timestamp('printed_at').defaultTo(knex.fn.now());
    table.integer('reprint_count').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('menu_categories', (table) => {
    table.text('description');
    table.string('image_url', 500);
    table.string('hero_image_url', 500);
    table.string('hero_title', 150);
    table.boolean('show_in_hero').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('delivery_orders', (table) => {
    table.string('order_channel', 30).notNullable().defaultTo('ONLINE');
    table.string('order_type', 30).notNullable().defaultTo('DELIVERY');
    table.string('table_number', 20);
    table.string('token_number', 20);
    table.decimal('tax_amount', 10, 2).notNullable().defaultTo(0);
    table.decimal('service_charge', 10, 2).notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('delivery_order_items', (table) => {
    table.text('notes');
  });

  await knex.schema.alterTable('delivery_riders', (table) => {
    table.boolean('is_active').notNullable().defaultTo(true);
  });

  const inStoreExists = await knex('delivery_zones').where({ id: IN_STORE_ZONE_ID }).first();
  if (!inStoreExists) {
    await knex('delivery_zones').insert({
      id: IN_STORE_ZONE_ID,
      zone_name: 'In-Store',
      base_fee: 0,
      estimated_time: 'Immediate',
      service_area: { areas: ['In-Store'], center: { lat: 0, lng: 0 }, radius_km: 0 },
      is_active: true,
    });
  }

  await knex('app_settings').insert({
    id: SETTINGS_ID,
    settings: DEFAULT_SETTINGS,
  });

  await knex('hero_content').insert({
    id: HERO_ID,
    content: DEFAULT_HERO,
  });
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('delivery_riders', (table) => {
    table.dropColumn('is_active');
  });

  await knex.schema.alterTable('delivery_order_items', (table) => {
    table.dropColumn('notes');
  });

  await knex.schema.alterTable('delivery_orders', (table) => {
    table.dropColumn('order_channel');
    table.dropColumn('order_type');
    table.dropColumn('table_number');
    table.dropColumn('token_number');
    table.dropColumn('tax_amount');
    table.dropColumn('service_charge');
  });

  await knex.schema.alterTable('menu_categories', (table) => {
    table.dropColumn('description');
    table.dropColumn('image_url');
    table.dropColumn('hero_image_url');
    table.dropColumn('hero_title');
    table.dropColumn('show_in_hero');
    table.dropColumn('created_at');
    table.dropColumn('updated_at');
  });

  await knex.schema.dropTableIfExists('order_slips');
  await knex.schema.dropTableIfExists('hero_content');
  await knex.schema.dropTableIfExists('app_settings');

  await knex('delivery_zones').where({ id: IN_STORE_ZONE_ID }).del();
};
