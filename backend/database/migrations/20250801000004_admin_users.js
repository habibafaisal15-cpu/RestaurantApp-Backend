/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('admin_users', (table) => {
    table.string('id', 36).primary();
    table.string('full_name', 100).notNullable();
    table.string('email', 150).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('role', 30).notNullable().defaultTo('admin');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_login_at');
  });
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('admin_users');
};
