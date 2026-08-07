const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const ALLOWED_FOLDERS = new Set(['products', 'deals', 'categories', 'hero']);

async function saveMediaFile({ folder, filename, mimeType, buffer }) {
  if (!ALLOWED_FOLDERS.has(folder)) {
    throw new Error(`Invalid upload folder: ${folder}`);
  }
  if (!buffer?.length) {
    throw new Error('Empty image file');
  }

  const id = uuidv4();
  const row = {
    id,
    folder,
    filename,
    mime_type: mimeType || 'application/octet-stream',
    data: buffer,
    size_bytes: buffer.length,
  };

  await db('media_files')
    .insert(row)
    .onConflict(['folder', 'filename'])
    .merge({
      mime_type: row.mime_type,
      data: row.data,
      size_bytes: row.size_bytes,
    });

  return {
    id,
    folder,
    filename,
    url: `/uploads/${folder}/${filename}`,
    mime_type: row.mime_type,
  };
}

async function getMediaFile(folder, filename) {
  if (!ALLOWED_FOLDERS.has(folder) || !filename) return null;
  return db('media_files').where({ folder, filename }).first();
}

async function deleteMediaFile(folder, filename) {
  if (!ALLOWED_FOLDERS.has(folder) || !filename) return 0;
  return db('media_files').where({ folder, filename }).del();
}

module.exports = {
  ALLOWED_FOLDERS,
  saveMediaFile,
  getMediaFile,
  deleteMediaFile,
};
