const authService = require('../../services/auth/authService');

async function login(req, res) {
  const result = await authService.login(req.body.email, req.body.password);
  res.json({ success: true, data: result });
}

async function me(req, res) {
  const admin = await authService.getAdminById(req.admin.id);
  res.json({ success: true, data: admin });
}

async function changePassword(req, res) {
  const result = await authService.changePassword(
    req.admin.id,
    req.body.current_password,
    req.body.new_password,
  );
  res.json({ success: true, data: result });
}

async function forgotPassword(req, res) {
  const result = await authService.forgotPassword(req.body.email);
  res.json({ success: true, data: result });
}

async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body.token, req.body.new_password);
  res.json({ success: true, data: result });
}

async function riderLogin(req, res) {
  const result = await authService.riderLogin(req.body.phone);
  res.json({ success: true, data: result });
}

module.exports = {
  login,
  riderLogin,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
};
