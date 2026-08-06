/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('delivery_orders', (table) => {
    table.timestamp('accepted_at');
    table.timestamp('rider_assign_deadline');
  });
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('delivery_orders', (table) => {
    table.dropColumn('accepted_at');
    table.dropColumn('rider_assign_deadline');
  });
};
