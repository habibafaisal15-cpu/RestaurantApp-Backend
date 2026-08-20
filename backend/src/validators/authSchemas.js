const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const riderLoginSchema = z.object({
  phone: z.string().min(5).max(20),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
});

function validateBody(schema) {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

module.exports = {
  loginSchema,
  riderLoginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateBody,
};
