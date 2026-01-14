const crypto = require('crypto');
const Account = require('../models/Account');
const Session = require('../models/Session');
const asyncHandler = require('../utils/asyncHandler');

const COOKIE_NAME = 'pf_session';

const hashSessionId = (sessionId) => crypto
  .createHash('sha256')
  .update(String(sessionId || ''))
  .digest('hex');

const authenticate = asyncHandler(async (req, res, next) => {
  const sessionId = req.cookies?.[COOKIE_NAME] ? String(req.cookies[COOKIE_NAME]) : null;
  if (!sessionId) {
    return res.status(401).json({ error: 'Session missing' });
  }

  const sessionIdHash = hashSessionId(sessionId);
  const session = await Session.findOne({ sessionIdHash });
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  if (session.expiresAt && session.expiresAt <= new Date()) {
    await Session.deleteOne({ _id: session._id });
    return res.status(401).json({ error: 'Session expired' });
  }

  const account = await Account.findById(session.accountId);
  if (!account) {
    await Session.deleteOne({ _id: session._id });
    return res.status(401).json({ error: 'Account not found' });
  }

  session.lastUsedAt = new Date();
  await session.save().catch(() => {});

  req.user = account;
  req.session = session;
  return next();
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
