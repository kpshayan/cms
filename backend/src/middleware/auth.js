const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  let token = null;

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies?.pf_token) {
    token = req.cookies.pf_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const account = await Account.findById(payload.sub);
    if (!account) {
      return res.status(401).json({ error: 'Account not found' });
    }
    req.user = account;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

const requirePermission = (permissionKey) => (req, res, next) => {
  const hasPermission = Boolean(req.user?.permissions?.[permissionKey]);
  if (!hasPermission) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  return next();
};

const requireAnyPermission = (...permissionKeys) => (req, res, next) => {
  const granted = permissionKeys.some((key) => Boolean(req.user?.permissions?.[key]));
  if (!granted) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  return next();
};

const requireAdmin1 = (req, res, next) => {
  if (req.user?.username !== 'admin1') {
    return res.status(403).json({ error: 'Only admin1 can perform this action' });
  }
  return next();
};

module.exports = {
  authenticate,
  requirePermission,
  requireAnyPermission,
  requireAdmin1,
};
