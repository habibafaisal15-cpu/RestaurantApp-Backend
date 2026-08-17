/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  const hasStockQty = await knex.schema.hasColumn('products', 'stock_qty');
  if (!hasStockQty) {
    await knex.schema.alterTable('products', (table) => {
      table.integer('stock_qty').notNullable().defaultTo(0);
      table.integer('low_stock_threshold').notNullable().defaultTo(5);
      table.boolean('track_stock').notNullable().defaultTo(false);
    });
  }

  const hasMovements = await knex.schema.hasTable('stock_movements');
  if (!hasMovements) {
    await knex.schema.createTable('stock_movements', (table) => {
      table.string('id', 36).primary();
      table
        .string('product_id', 36)
        .notNullable()
        .references('id')
        .inTable('products')
        .onDelete('CASCADE');
      table.string('type', 20).notNullable(); // in | out | adjust | sale | return
      table.integer('quantity').notNullable();
      table.integer('quantity_before').notNullable().defaultTo(0);
      table.integer('quantity_after').notNullable().defaultTo(0);
      table.string('reason', 255).nullable();
      table.string('reference_type', 40).nullable();
      table.string('reference_id', 36).nullable();
      table.string('created_by', 36).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['product_id', 'created_at']);
    });
  }
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('stock_movements');

  const hasStockQty = await knex.schema.hasColumn('products', 'stock_qty');
  if (hasStockQty) {
    await knex.schema.alterTable('products', (table) => {
      table.dropColumn('stock_qty');
      table.dropColumn('low_stock_threshold');
      table.dropColumn('track_stock');
    });
  }
};
