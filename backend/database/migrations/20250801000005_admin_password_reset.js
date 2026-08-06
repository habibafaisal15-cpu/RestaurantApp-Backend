/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('admin_users', (table) => {
    table.string('password_reset_token_hash', 64);
    table.timestamp('password_reset_expires_at');
  });
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('admin_users', (table) => {
    table.dropColumn('password_reset_token_hash');
    table.dropColumn('password_reset_expires_at');
  });
};
