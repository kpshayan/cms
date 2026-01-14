const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const cookieToken = req.cookies?.pf_token ? String(req.cookies.pf_token) : null;

  // IMPORTANT: Azure Static Web Apps may inject its own Authorization bearer token
  // for SWA's built-in auth. That token is not signed with our JWT_SECRET.
  // Prefer our cookie token first; fall back to Bearer only if cookie is absent.
  const candidates = [];
  if (cookieToken) candidates.push({ source: 'cookie', token: cookieToken });
  if (bearerToken) candidates.push({ source: 'bearer', token: bearerToken });

  if (candidates.length === 0) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  try {
    let lastErr = null;
    for (const candidate of candidates) {
      try {
        const payload = jwt.verify(candidate.token, process.env.JWT_SECRET);
        const account = await Account.findById(payload.sub);
        if (!account) {
          return res.status(401).json({ error: 'Account not found' });
        }
        req.user = account;
        req.authSource = candidate.source;
        return next();
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Token verification failed');
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
  // Admin1 “group” members share the same FULL_ACCESS role.
  if (req.user?.role !== 'FULL_ACCESS') {
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
