/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('deals', (table) => {
    table.string('id', 36).primary();
    table.string('title', 150).notNullable();
    table.text('description');
    table.string('image_url', 500);
    table.string('discount_type', 20).notNullable().defaultTo('percentage');
    table.decimal('discount_value', 10, 2).notNullable();
    table.json('product_ids');
    table.timestamp('starts_at');
    table.timestamp('ends_at');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('deals');
};
