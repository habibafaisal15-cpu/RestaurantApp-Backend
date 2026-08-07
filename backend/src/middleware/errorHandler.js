const multer = require('multer');
const { ZodError } = require('zod');
const { AppError } = require('../errors/AppError');
const { UnauthorizedError, ForbiddenError } = require('../errors/AuthError');

function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      code: 'UPLOAD_ERROR',
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 5 MB or smaller'
        : err.message,
    });
  }

  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      code: 'UPLOAD_ERROR',
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    const first = err.errors?.[0];
    const detail = first
      ? `${first.path?.join('.') || 'field'}: ${first.message}`
      : 'Invalid request data';
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: detail,
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong',
  });
}

module.exports = errorHandler;
