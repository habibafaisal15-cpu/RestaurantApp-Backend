const path = require('path');
const express = require('express');
const cors = require('cors');
const v1Routes = require('./routes/v1');
const errorHandler = require('./middleware/errorHandler');
const { corsOrigin } = require('./config/env');
const { ensureUploadDirs } = require('./config/upload');
const { createNoopIo } = require('./utils/noopIo');

ensureUploadDirs();

const app = express();
app.set('io', createNoopIo());

app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
}));
app.use(express.json());
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
