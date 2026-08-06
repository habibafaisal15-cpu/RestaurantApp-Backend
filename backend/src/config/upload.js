const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'restaurant-uploads')
  : path.join(__dirname, '../../uploads');

function ensureUploadDirs() {
  for (const dir of ['products', 'deals', 'categories', 'hero']) {
    const full = path.join(UPLOAD_ROOT, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }
}

function buildPublicUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
}

module.exports = {
  UPLOAD_ROOT,
  ensureUploadDirs,
  buildPublicUrl,
};
