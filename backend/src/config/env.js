require('dotenv').config();

function envBool(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  googleMapsBrowserKey: process.env.GOOGLE_MAPS_BROWSER_KEY || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  email: {
    enabled: envBool('EMAIL_ENABLED'),
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: envBool('SMTP_SECURE'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Restaurant Admin <noreply@restaurant.local>',
    adminFrontendUrl: (process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174').replace(/\/$/, ''),
    devReturnToken: envBool('EMAIL_DEV_RETURN_TOKEN'),
  },
};
