/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  const hasPhone = await knex.schema.hasColumn('admin_users', 'phone');
  if (!hasPhone) {
    await knex.schema.alterTable('admin_users', (table) => {
      table.string('phone', 30).nullable();
    });
  }
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  const hasPhone = await knex.schema.hasColumn('admin_users', 'phone');
  if (hasPhone) {
    await knex.schema.alterTable('admin_users', (table) => {
      table.dropColumn('phone');
    });
  }
};
