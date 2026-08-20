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

/** Admin staff or kitchen staff (admin_users JWT). */
function authenticateKitchen(req, _res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  try {
    const payload = authService.verifyToken(token);
    if (payload.role === 'rider') {
      return next(new UnauthorizedError('Kitchen access required'));
    }
    req.admin = {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'kitchen',
      full_name: payload.name,
    };
    req.actor = 'kitchen';
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Rider JWT from /auth/rider-login. */
function authenticateRider(req, _res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  try {
    const payload = authService.verifyToken(token);
    if (payload.role !== 'rider') {
      return next(new UnauthorizedError('Rider access required'));
    }
    req.rider = {
      id: payload.sub,
      name: payload.name,
      phone: payload.phone,
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
