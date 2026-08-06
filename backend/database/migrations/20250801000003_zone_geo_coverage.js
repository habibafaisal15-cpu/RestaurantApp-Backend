/**
 * Add GPS radius to existing Downtown zone for live location matching.
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  const zones = await knex('delivery_zones').select('id', 'zone_name', 'service_area');

  for (const zone of zones) {
    let area = zone.service_area;
    if (typeof area === 'string') {
      try {
        area = JSON.parse(area);
      } catch {
        area = {};
      }
    }

    if (!area.center) {
      area.center = { lat: 31.5497, lng: 74.3436 };
      area.radius_km = area.radius_km || 12;
      area.areas = [...new Set([...(area.areas || []), 'Lahore'])];
      await knex('delivery_zones').where({ id: zone.id }).update({ service_area: area });
    }
  }
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(_knex) {
  // No rollback — geo fields are additive
};
