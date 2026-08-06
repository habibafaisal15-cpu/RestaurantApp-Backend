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

module.exports = { authenticateAdmin };
