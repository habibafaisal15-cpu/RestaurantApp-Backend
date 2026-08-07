/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('media_files', (table) => {
    table.uuid('id').primary();
    table.string('folder', 40).notNullable();
    table.string('filename', 255).notNullable();
    table.string('mime_type', 100).notNullable();
    table.specificType('data', 'bytea').notNullable();
    table.integer('size_bytes').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['folder', 'filename']);
    table.index(['folder']);
  });
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('media_files');
};
