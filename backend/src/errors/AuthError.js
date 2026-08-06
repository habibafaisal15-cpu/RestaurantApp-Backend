class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.statusCode = 401;
    this.code = 'UNAUTHORIZED';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.statusCode = 403;
    this.code = 'FORBIDDEN';
  }
}

module.exports = { UnauthorizedError, ForbiddenError };
