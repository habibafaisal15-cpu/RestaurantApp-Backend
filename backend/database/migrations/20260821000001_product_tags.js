/**
 * Add tags JSON column on products for admin menu tags (spicy, bestseller, etc.).
 */
exports.up = async function up(knex) {
  const hasTags = await knex.schema.hasColumn('products', 'tags');
  if (!hasTags) {
    await knex.schema.alterTable('products', (table) => {
      table.json('tags').nullable();
    });
  }
};

exports.down = async function down(knex) {
  const hasTags = await knex.schema.hasColumn('products', 'tags');
  if (hasTags) {
    await knex.schema.alterTable('products', (table) => {
      table.dropColumn('tags');
    });
  }
};
