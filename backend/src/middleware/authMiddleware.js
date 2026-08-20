const authService = require('../services/auth/authService');
const { UnauthorizedError } = require('../errors/AuthError');

function authenticateAdmin(req, _res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  try {
    const payload = authService.verifyToken(token);
    if (payload.role === 'rider') {
      return next(new UnauthorizedError('Admin access required'));
    }
    req.admin = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      full_name: payload.name,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Kitchen staff only (admin_users role=kitchen). */
function authenticateKitchen(req, _res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  try {
    const payload = authService.verifyToken(token);
    if (String(payload.role || '').toLowerCase() !== 'kitchen') {
      return next(new UnauthorizedError('Kitchen access required'));
    }
    req.admin = {
      id: payload.sub,
      email: payload.email,
      role: 'kitchen',
      full_name: payload.name,
    };
    req.actor = 'kitchen';
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Rider staff JWT (admin_users role=rider) or legacy rider phone JWT. */
function authenticateRider(req, _res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  try {
    const payload = authService.verifyToken(token);
    if (String(payload.role || '').toLowerCase() !== 'rider') {
      return next(new UnauthorizedError('Rider access required'));
    }
    req.rider = {
      id: payload.sub,
      name: payload.name,
      phone: payload.phone || null,
      email: payload.email || null,
      role: 'rider',
    };
    req.actor = 'rider';
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateAdmin,
  authenticateKitchen,
  authenticateRider,
};
