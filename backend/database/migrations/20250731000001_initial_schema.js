/**
 * Initial schema for the delivery module.
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('delivery_zones', (table) => {
    table.string('id', 36).primary();
    table.string('zone_name', 100).notNullable();
    table.decimal('base_fee', 10, 2).notNullable();
    table.string('estimated_time', 50).notNullable();
    table.json('service_area').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('menu_categories', (table) => {
    table.string('id', 36).primary();
    table.string('category_name', 100).notNullable();
    table.integer('display_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('products', (table) => {
    table.string('id', 36).primary();
    table.string('category_id', 36).notNullable().references('id').inTable('menu_categories');
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('image_url', 500);
    table.decimal('price', 10, 2).notNullable();
    table.boolean('available_for_delivery').notNullable().defaultTo(true);
    table.boolean('in_stock').notNullable().defaultTo(true);
    table.boolean('is_active').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('delivery_riders', (table) => {
    table.string('id', 36).primary();
    table.string('full_name', 100).notNullable();
    table.string('phone_number', 20).notNullable().unique();
    table.string('vehicle_type', 50);
    table.string('vehicle_number', 50);
    table.string('status', 20).notNullable().defaultTo('Available');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('delivery_orders', (table) => {
    table.string('id', 36).primary();
    table.string('order_number', 20).notNullable().unique();
    table.string('customer_name', 100).notNullable();
    table.string('customer_phone', 20).notNullable();
    table.text('delivery_address').notNullable();
    table.text('delivery_instructions');
    table.string('zone_id', 36).notNullable().references('id').inTable('delivery_zones');
    table.string('rider_id', 36).references('id').inTable('delivery_riders');
    table.string('rider_name', 100);
    table.string('rider_phone', 20);
    table.string('order_status', 30).notNullable().defaultTo('New');
    table.string('tracking_token', 64).notNullable().unique();
    table.timestamp('eta');
    table.string('payment_status', 20).notNullable().defaultTo('Pending');
    table.string('payment_method', 20).notNullable();
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('delivery_fee', 10, 2).notNullable();
    table.decimal('discount', 10, 2).notNullable().defaultTo(0);
    table.decimal('total_amount', 10, 2).notNullable();
    table.timestamp('order_time').defaultTo(knex.fn.now());
    table.timestamp('estimated_delivery_time');
    table.timestamp('delivered_at');
  });

  await knex.schema.createTable('delivery_order_items', (table) => {
    table.string('id', 36).primary();
    table
      .string('order_id', 36)
      .notNullable()
      .references('id')
      .inTable('delivery_orders')
      .onDelete('CASCADE');
    table.string('product_id', 36).references('id').inTable('products');
    table.string('product_name', 100).notNullable();
    table.integer('quantity').notNullable();
    table.decimal('unit_price', 10, 2).notNullable();
    table.decimal('total_price', 10, 2).notNullable();
  });

  await knex.schema.createTable('order_tracking_logs', (table) => {
    table.string('id', 36).primary();
    table
      .string('order_id', 36)
      .notNullable()
      .references('id')
      .inTable('delivery_orders')
      .onDelete('CASCADE');
    table.string('status', 50).notNullable();
    table.string('set_by', 100);
    table.string('note', 255);
    table.timestamp('logged_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('order_tracking_logs');
  await knex.schema.dropTableIfExists('delivery_order_items');
  await knex.schema.dropTableIfExists('delivery_orders');
  await knex.schema.dropTableIfExists('delivery_riders');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('menu_categories');
  await knex.schema.dropTableIfExists('delivery_zones');
};
