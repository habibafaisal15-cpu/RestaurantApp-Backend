/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('delivery_orders', (table) => {
    table.decimal('delivery_latitude', 10, 7);
    table.decimal('delivery_longitude', 10, 7);
    table.string('delivery_place_id', 255);
  });
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('delivery_orders', (table) => {
    table.dropColumn('delivery_latitude');
    table.dropColumn('delivery_longitude');
    table.dropColumn('delivery_place_id');
  });
};
