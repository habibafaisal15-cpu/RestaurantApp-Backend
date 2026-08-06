const db = require('../../config/database');
const { NotFoundError } = require('../../errors/AppError');

const SETTINGS_ID = 'default';

function parseJson(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function getSettings() {
  const row = await db('app_settings').where({ id: SETTINGS_ID }).first();
  if (!row) throw new NotFoundError('Settings not found');

  const settings = parseJson(row.settings);
  return {
    ...settings,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };
}

async function updateSettings(partial) {
  const existing = await getSettings();
  const merged = {
    ...existing,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  await db('app_settings')
    .where({ id: SETTINGS_ID })
    .update({
      settings: merged,
      updated_at: db.fn.now(),
    });

  return merged;
}

module.exports = {
  getSettings,
  updateSettings,
};
