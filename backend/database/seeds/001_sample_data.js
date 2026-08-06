const { v4: uuidv4 } = require('uuid');

const zoneId = uuidv4();
const catStarters = uuidv4();
const catMains = uuidv4();
const catBeverages = uuidv4();
const rider1 = uuidv4();
const rider2 = uuidv4();

/**
 * @param { import('knex').Knex } knex
 */
exports.seed = async function seed(knex) {
  await knex('order_tracking_logs').del();
  await knex('delivery_order_items').del();
  await knex('delivery_orders').del();
  await knex('delivery_riders').del();
  await knex('products').del();
  await knex('menu_categories').del();
  await knex('delivery_zones').del();

  await knex('delivery_zones').insert({
    id: zoneId,
    zone_name: 'Downtown',
    base_fee: 2.99,
    estimated_time: '25-35 min',
    service_area: {
      pincodes: ['54000', '54001', '54002'],
      areas: ['Downtown', 'City Center', 'Main Market', 'Lahore'],
      center: { lat: 31.5497, lng: 74.3436 },
      radius_km: 12,
    },
    is_active: true,
  });

  await knex('menu_categories').insert([
    { id: catStarters, category_name: 'Starters', display_order: 1, is_active: true },
    { id: catMains, category_name: 'Mains', display_order: 2, is_active: true },
    { id: catBeverages, category_name: 'Beverages', display_order: 3, is_active: true },
  ]);

  await knex('products').insert([
    {
      id: uuidv4(),
      category_id: catStarters,
      name: 'Chicken Wings',
      description: 'Crispy wings with house sauce',
      price: 8.99,
      available_for_delivery: true,
      in_stock: true,
    },
    {
      id: uuidv4(),
      category_id: catStarters,
      name: 'Garlic Bread',
      description: 'Toasted with herb butter',
      price: 4.49,
      available_for_delivery: true,
      in_stock: true,
    },
    {
      id: uuidv4(),
      category_id: catMains,
      name: 'Classic Burger',
      description: 'Beef patty, cheese, lettuce, tomato',
      price: 12.99,
      available_for_delivery: true,
      in_stock: true,
    },
    {
      id: uuidv4(),
      category_id: catMains,
      name: 'Margherita Pizza',
      description: 'Fresh mozzarella and basil',
      price: 14.99,
      available_for_delivery: true,
      in_stock: false,
    },
    {
      id: uuidv4(),
      category_id: catBeverages,
      name: 'Fresh Lemonade',
      description: 'House-made, chilled',
      price: 3.49,
      available_for_delivery: true,
      in_stock: true,
    },
  ]);

  await knex('delivery_riders').insert([
    {
      id: rider1,
      full_name: 'Ahmed Khan',
      phone_number: '+923001234567',
      vehicle_type: 'Bike',
      vehicle_number: 'LEA-1234',
      status: 'Available',
    },
    {
      id: rider2,
      full_name: 'Usman Ali',
      phone_number: '+923007654321',
      vehicle_type: 'Bike',
      vehicle_number: 'LEA-5678',
      status: 'On Duty',
    },
  ]);
};

exports.zoneId = zoneId;
