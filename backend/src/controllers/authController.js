const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const asyncHandler = require('../utils/asyncHandler');
const {
  ROLE_DEFINITIONS,
  EXECUTOR_ROLE_BLUEPRINT,
  EXECUTOR_USERNAME_PREFIX,
  getRoleProfile,
} = require('../constants/roles');

const normalizeUsername = (value = '') => value.trim().toLowerCase();

const COOKIE_NAME = 'pf_token';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 12; // 12 hours

const buildToken = (account) => jwt.sign(
  {
    sub: account._id,
    username: account.username,
    role: account.role,
  },
  process.env.JWT_SECRET,
  { expiresIn: '12h' }
);

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: COOKIE_MAX_AGE,
  path: '/',
});

const attachAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, buildCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
};

const serializeAccount = (accountDoc) => {
  const account = accountDoc.toSafeJSON ? accountDoc.toSafeJSON() : accountDoc;
  return {
    id: account._id,
    username: account.username,
    name: account.displayName,
    role: account.role,
    scope: account.scope,
    avatar: account.avatar,
    permissions: account.permissions,
    isExecutor: account.isExecutor,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
};

const ensurePassword = (password) => {
  if (!password || password.length < 6) {
    const err = new Error('Password must be at least 6 characters long.');
    err.status = 400;
    throw err;
  }
};

exports.signup = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { password } = req.body;
  ensurePassword(password);

  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  let account = await Account.findOne({ username });

  if (!account) {
    const roleProfile = getRoleProfile(username);
    if (!roleProfile) {
      return res.status(400).json({ error: 'Only admin1, admin2, admin4, or provisioned admin3-* accounts can sign up.' });
    }
    account = new Account({
      username,
      displayName: roleProfile.displayName,
      role: roleProfile.role,
      scope: roleProfile.scope,
      avatar: roleProfile.avatar,
      permissions: roleProfile.permissions,
      isExecutor: false,
    });
  }

  if (account.passwordHash) {
    return res.status(400).json({ error: 'Account already configured. Please sign in.' });
  }

  account.passwordHash = await bcrypt.hash(password, 10);
  await account.save();

  const token = buildToken(account);
  attachAuthCookie(res, token);
  return res.status(201).json({ token, user: serializeAccount(account) });
});

exports.login = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const account = await Account.findOne({ username });
  if (!account || !account.passwordHash) {
    return res.status(400).json({ error: 'Invalid username or password.' });
  }

  if (account.status !== 'active') {
    return res.status(403).json({ error: 'Account is disabled.' });
  }

  const passwordMatch = await bcrypt.compare(password, account.passwordHash);
  if (!passwordMatch) {
    return res.status(400).json({ error: 'Invalid username or password.' });
  }

  const token = buildToken(account);
  attachAuthCookie(res, token);
  return res.json({ token, user: serializeAccount(account) });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.user._id);
  return res.json({ user: serializeAccount(account) });
});

exports.logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  return res.json({ success: true });
});

exports.resetAccount = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  const baseRole = ROLE_DEFINITIONS[username];
  if (!baseRole) {
    return res.status(400).json({ error: 'Only admin1, admin2, or admin4 accounts can be reset here.' });
  }

  const account = await Account.findOne({ username });
  if (!account || !account.passwordHash) {
    return res.status(400).json({ error: 'No password stored for this username.' });
  }

  account.passwordHash = null;
  await account.save();
  return res.json({ message: 'Password removed. Create a new one from the signup page.' });
});

exports.listExecutors = asyncHandler(async (req, res) => {
  const accounts = await Account.find({ isExecutor: true }).sort({ createdAt: 1 });
  return res.json({ executors: accounts.map(serializeAccount) });
});

exports.createExecutor = asyncHandler(async (req, res) => {
  const { name, email, username } = req.body;
  const trimmedName = (name || '').trim();
  const desiredUsername = normalizeUsername(username);

  if (!trimmedName) {
    return res.status(400).json({ error: 'Executor name is required.' });
  }

  const finalUsername = desiredUsername || `${EXECUTOR_USERNAME_PREFIX}${Date.now()}`;
  if (!finalUsername.startsWith(EXECUTOR_USERNAME_PREFIX)) {
    return res.status(400).json({ error: `Executor username must start with "${EXECUTOR_USERNAME_PREFIX}".` });
  }

  const existing = await Account.findOne({ username: finalUsername });
  if (existing) {
    return res.status(400).json({ error: 'Executor username already exists.' });
  }

  const account = new Account({
    username: finalUsername,
    displayName: trimmedName,
    ...(email ? { email: String(email).trim().toLowerCase() } : {}),
    role: EXECUTOR_ROLE_BLUEPRINT.role,
    scope: EXECUTOR_ROLE_BLUEPRINT.scope,
    avatar: (trimmedName || 'EX').slice(0, 2).toUpperCase(),
    permissions: EXECUTOR_ROLE_BLUEPRINT.permissions,
    isExecutor: true,
    createdBy: req.user.username,
  });

  await account.save();
  return res.status(201).json({ executor: serializeAccount(account) });
});

exports.updateExecutor = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const payload = req.body || {};

  const executor = await Account.findOne({ username, isExecutor: true });
  if (!executor) {
    return res.status(404).json({ error: 'Executor not found.' });
  }

  if (payload.name) {
    executor.displayName = payload.name.trim();
  }
  if (payload.email) {
    executor.email = payload.email.trim().toLowerCase();
  }
  if (payload.avatar) {
    executor.avatar = payload.avatar.trim().slice(0, 2).toUpperCase();
  }
  if (payload.permissions) {
    executor.permissions = {
      ...EXECUTOR_ROLE_BLUEPRINT.permissions,
      ...payload.permissions,
    };
  }
  if (payload.status) {
    executor.status = payload.status;
  }

  executor.updatedBy = req.user.username;
  await executor.save();
  return res.json({ executor: serializeAccount(executor) });
});

exports.resetExecutorPassword = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const executor = await Account.findOne({ username, isExecutor: true });
  if (!executor) {
    return res.status(404).json({ error: 'Executor not found.' });
  }
  executor.passwordHash = null;
  executor.updatedBy = req.user.username;
  await executor.save();
  return res.json({ executor: serializeAccount(executor) });
});

exports.deleteExecutor = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const executor = await Account.findOneAndDelete({ username, isExecutor: true });
  if (!executor) {
    return res.status(404).json({ error: 'Executor not found.' });
  }
  return res.json({ success: true });
});
