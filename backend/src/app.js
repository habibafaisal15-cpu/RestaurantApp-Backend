const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const v1Routes = require('./routes/v1');
const errorHandler = require('./middleware/errorHandler');
const { corsOrigin } = require('./config/env');
const { UPLOAD_ROOT, ensureUploadDirs } = require('./config/upload');
const mediaService = require('./services/mediaService');
const { createNoopIo } = require('./utils/noopIo');

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (!corsOrigin || corsOrigin === '*') return true;

  const allowed = corsOrigin.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (allowed.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

ensureUploadDirs();

const app = express();
app.set('io', createNoopIo());

app.use(cors({
  origin(origin, callback) {
    callback(null, isAllowedCorsOrigin(origin));
  },
}));
app.use(express.json({ limit: '2mb' }));

async function serveUploadedMedia(req, res, next) {
  try {
    const { folder, filename } = req.params;
    if (!mediaService.ALLOWED_FOLDERS.has(folder) || filename.includes('..')) {
      return res.status(404).end();
    }

    const diskPath = path.join(UPLOAD_ROOT, folder, filename);
    if (fs.existsSync(diskPath)) {
      return res.sendFile(diskPath);
    }

    const row = await mediaService.getMediaFile(folder, filename);
    if (!row?.data) {
      return res.status(404).end();
    }

    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data));
  } catch (error) {
    return next(error);
  }
}

app.get('/uploads/:folder/:filename', serveUploadedMedia);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Legacy alias for frontend env using /api instead of /api/v1
app.use('/api', v1Routes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Restaurant Delivery API',
    version: '1.0.0',
    docs: '/api/v1/health',
  });
});

app.use('/api/v1', v1Routes);
app.use(errorHandler);

module.exports = app;
