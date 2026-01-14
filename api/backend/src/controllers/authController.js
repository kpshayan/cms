const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Account = require('../models/Account');
const AccessGroup = require('../models/AccessGroup');
const Session = require('../models/Session');
const asyncHandler = require('../utils/asyncHandler');
const {
  ROLE_DEFINITIONS,
  EXECUTOR_ROLE_BLUEPRINT,
  EXECUTOR_USERNAME_PREFIX,
} = require('../constants/roles');

const normalizeUsername = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const isLegacyExecutorUsername = (username) => String(username || '').toLowerCase().startsWith(EXECUTOR_USERNAME_PREFIX);

const loadGroups = async () => {
  const docs = await AccessGroup.find({ key: { $in: ['admin1', 'admin2', 'admin3', 'admin4'] } });
  const map = { admin1: [], admin2: [], admin3: [], admin4: [] };
  for (const doc of docs) {
    map[doc.key] = Array.isArray(doc.usernames) ? doc.usernames : [];
  }
  return map;
};

const ROLE_KEY_BY_LABEL = {
  owner: 'admin1',
  admin: 'admin2',
  administrator: 'admin2',
  write: 'admin3',
  read: 'admin4',
  none: null,
  admin1: 'admin1',
  admin2: 'admin2',
  admin3: 'admin3',
  admin4: 'admin4',
};

const serializeRoleAssignments = (groups) => ({
  owner: Array.isArray(groups?.admin1) ? groups.admin1 : [],
  administrator: Array.isArray(groups?.admin2) ? groups.admin2 : [],
  write: Array.isArray(groups?.admin3) ? groups.admin3 : [],
  read: Array.isArray(groups?.admin4) ? groups.admin4 : [],
});

const getOrCreateGroupDoc = async (key) => {
  const normalizedKey = String(key || '').trim().toLowerCase();
  if (!['admin1', 'admin2', 'admin3', 'admin4'].includes(normalizedKey)) {
    const err = new Error('Invalid role key.');
    err.status = 400;
    throw err;
  }

  let doc = await AccessGroup.findOne({ key: normalizedKey });
  if (!doc) {
    doc = await AccessGroup.create({ key: normalizedKey, usernames: [] });
  }
  if (!Array.isArray(doc.usernames)) {
    doc.usernames = [];
  }
  return doc;
};

const isAllowedUsername = (username, groups) => {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;
  const list = (arr) => (Array.isArray(arr) ? arr : []).map(normalizeUsername);
  return (
    list(groups.admin1).includes(normalized)
    || list(groups.admin2).includes(normalized)
    || list(groups.admin3).includes(normalized)
    || list(groups.admin4).includes(normalized)
  );
};

const resolveProfileFromGroups = (username, groups) => {
  const normalized = normalizeUsername(username);
  const list = (arr) => (Array.isArray(arr) ? arr : []).map(normalizeUsername);
  if (list(groups.admin1).includes(normalized)) {
    const template = ROLE_DEFINITIONS.admin1;
    return {
      displayName: normalized,
      role: template.role,
      scope: template.scope,
      avatar: normalized.slice(0, 2).toUpperCase(),
      permissions: template.permissions,
      isExecutor: false,
    };
  }

  if (list(groups.admin2).includes(normalized)) {
    const template = ROLE_DEFINITIONS.admin2;
    return {
      displayName: normalized,
      role: template.role,
      scope: template.scope,
      avatar: normalized.slice(0, 2).toUpperCase(),
      permissions: template.permissions,
      isExecutor: false,
    };
  }

  if (list(groups.admin3).includes(normalized)) {
    return {
      displayName: normalized,
      role: EXECUTOR_ROLE_BLUEPRINT.role,
      scope: EXECUTOR_ROLE_BLUEPRINT.scope,
      avatar: normalized.slice(0, 2).toUpperCase() || 'EX',
      permissions: EXECUTOR_ROLE_BLUEPRINT.permissions,
      isExecutor: true,
    };
  }

  if (list(groups.admin4).includes(normalized)) {
    const template = ROLE_DEFINITIONS.admin4;
    return {
      displayName: normalized,
      role: template.role,
      scope: template.scope,
      avatar: normalized.slice(0, 2).toUpperCase(),
      permissions: template.permissions,
      isExecutor: false,
    };
  }

  return null;
};

const syncAccountFromProfile = async (account, profile) => {
  if (!account || !profile) return account;

  let mutated = false;
  const nextDisplayName = profile.displayName;
  const nextRole = profile.role;
  const nextScope = profile.scope;
  const nextAvatar = profile.avatar;
  const nextPermissions = profile.permissions;
  const nextIsExecutor = Boolean(profile.isExecutor);

  if (account.displayName !== nextDisplayName) {
    account.displayName = nextDisplayName;
    mutated = true;
  }
  if (account.role !== nextRole) {
    account.role = nextRole;
    mutated = true;
  }
  if ((account.scope || '') !== (nextScope || '')) {
    account.scope = nextScope;
    mutated = true;
  }
  if ((account.avatar || '') !== (nextAvatar || '')) {
    account.avatar = nextAvatar;
    mutated = true;
  }
  if (Boolean(account.isExecutor) !== nextIsExecutor) {
    account.isExecutor = nextIsExecutor;
    mutated = true;
  }

  // Shallow compare permissions
  const currentPermissions = account.permissions || {};
  const incomingPermissions = nextPermissions || {};
  const keys = new Set([...Object.keys(currentPermissions), ...Object.keys(incomingPermissions)]);
  for (const key of keys) {
    if (Boolean(currentPermissions[key]) !== Boolean(incomingPermissions[key])) {
      account.permissions = incomingPermissions;
      mutated = true;
      break;
    }
  }

  if (mutated) {
    await account.save();
  }
  return account;
};

const COOKIE_NAME = 'pf_session';
const LEGACY_COOKIE_NAME = 'pf_token';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 12; // 12 hours

const isProduction = () => process.env.NODE_ENV === 'production';

const hashSessionId = (sessionId) => crypto
  .createHash('sha256')
  .update(String(sessionId || ''))
  .digest('hex');

const createSessionForAccount = async (account, req) => {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE);
  await Session.create({
    sessionIdHash: hashSessionId(sessionId),
    accountId: account._id,
    expiresAt,
    lastUsedAt: new Date(),
    userAgent: String(req.headers?.['user-agent'] || ''),
  });
  return sessionId;
};

const buildCookieOptions = () => ({
  httpOnly: true,
  const crossSite = isCrossSiteRequest(req);
  secure: isProduction(),
  maxAge: COOKIE_MAX_AGE,
    // Prefer Lax for same-site (better mobile compatibility).
    // Use None only when the request is cross-site and HTTPS (required by browsers).
    sameSite: crossSite && secure ? 'none' : 'lax',
const attachAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, buildCookieOptions());
};

const clearAuthCookie = (res) => {

const isCrossSiteRequest = (req) => {
  const origin = String(req?.headers?.origin || '').trim();
  const host = String(req?.headers?.host || '').trim();
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    return url.host !== host;
  } catch {
    return false;
  }
};
  const opts = {
    httpOnly: true,
    sameSite: isProduction() ? 'none' : 'lax',
    secure: isProduction(),
    path: '/',
  };
  res.clearCookie(COOKIE_NAME, opts);
  // Clear legacy JWT cookie if present
  res.clearCookie(LEGACY_COOKIE_NAME, opts);
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

  // Legacy executor usernames (admin3-*) are no longer accepted.
  if (isLegacyExecutorUsername(username)) {
    return res.status(400).json({ error: 'This username format is no longer allowed. Use your assigned name instead.' });
  }

  const groups = await loadGroups();
  if (!isAllowedUsername(username, groups)) {
    return res.status(400).json({ error: 'Username is not allowed. Ask an admin to add your name.' });
  }

  let account = await Account.findOne({ username });

  if (!account) {
    const roleProfile = resolveProfileFromGroups(username, groups);
    if (!roleProfile) {
      return res.status(400).json({ error: 'Username is not allowed. Ask an admin to add your name.' });
    }
    account = new Account({
      username,
      displayName: roleProfile.displayName,
      role: roleProfile.role,
      scope: roleProfile.scope,
      avatar: roleProfile.avatar,
      permissions: roleProfile.permissions,
      isExecutor: Boolean(roleProfile.isExecutor),
    });
  } else {
    // If the account already exists, keep it but ensure the role matches the current group assignment.
    const roleProfile = resolveProfileFromGroups(username, groups);
    if (roleProfile) {
      account = await syncAccountFromProfile(account, roleProfile);
    }
  }

  if (account.passwordHash) {
    return res.status(400).json({ error: 'Account already configured. Please sign in.' });
  }

  account.passwordHash = await bcrypt.hash(password, 10);
  await account.save();

  const sessionId = await createSessionForAccount(account, req);
  attachAuthCookie(res, sessionId, req);
  return res.status(201).json({ user: serializeAccount(account) });
});

exports.login = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  let account = await Account.findOne({ username });
  if (!account || !account.passwordHash) {
    return res.status(400).json({ error: 'Invalid username or password.' });
  }

  // Enforce allowlist-only logins.
  if (isLegacyExecutorUsername(username)) {
    return res.status(400).json({ error: 'Invalid username or password.' });
  }
  const groups = await loadGroups();
  if (!isAllowedUsername(username, groups)) {
    return res.status(403).json({ error: 'This username is no longer allowed.' });
  }

  // Sync permissions/role with current group settings.
  const roleProfile = resolveProfileFromGroups(username, groups);
  if (roleProfile) {
    account = await syncAccountFromProfile(account, roleProfile);
  }

  if (account.status !== 'active') {
    return res.status(403).json({ error: 'Account is disabled.' });
  }

  const passwordMatch = await bcrypt.compare(password, account.passwordHash);
  if (!passwordMatch) {
    return res.status(400).json({ error: 'Invalid username or password.' });
  }

  const sessionId = await createSessionForAccount(account, req);
  attachAuthCookie(res, sessionId, req);
  return res.json({ user: serializeAccount(account) });
});

// Owner/admin1-only role management
exports.getRoleAssignments = asyncHandler(async (req, res) => {
  const groups = await loadGroups();
  return res.json({ roles: serializeRoleAssignments(groups) });
});

exports.assignRole = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const incomingRole = String(req.body.role || '').trim().toLowerCase();
  const roleKey = ROLE_KEY_BY_LABEL[incomingRole];

  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }
  if (isLegacyExecutorUsername(username)) {
    return res.status(400).json({ error: 'This username format is no longer allowed. Use your assigned name instead.' });
  }
  if (roleKey === undefined) {
    return res.status(400).json({ error: 'Role is required (owner/administrator/write/read) or "none" to remove.' });
  }

  const groupDocs = await Promise.all([
    getOrCreateGroupDoc('admin1'),
    getOrCreateGroupDoc('admin2'),
    getOrCreateGroupDoc('admin3'),
    getOrCreateGroupDoc('admin4'),
  ]);

  // Remove username from all groups (one-role-only), then add to target.
  for (const group of groupDocs) {
    group.usernames = (group.usernames || []).filter((u) => normalizeUsername(u) !== username);
  }

  if (roleKey) {
    const target = groupDocs.find((g) => g.key === roleKey);
    if (target && !target.usernames.some((u) => normalizeUsername(u) === username)) {
      target.usernames.push(username);
    }
  }

  await Promise.all(groupDocs.map((g) => g.save()));

  const groups = await loadGroups();

  // If the account already exists, immediately sync its permissions/role to match the assignment.
  const existing = await Account.findOne({ username });
  if (existing) {
    const roleProfile = resolveProfileFromGroups(username, groups);
    if (roleProfile) {
      await syncAccountFromProfile(existing, roleProfile);
    }
  }

  return res.json({ roles: serializeRoleAssignments(groups) });
});

exports.getProfile = asyncHandler(async (req, res) => {
  let account = await Account.findById(req.user._id);

  // Keep the session consistent with current group membership.
  // If removed from allowlist, deny profile.
  const groups = await loadGroups();
  if (!isAllowedUsername(account?.username, groups)) {
    if (req.session?._id) {
      await Session.deleteOne({ _id: req.session._id }).catch(() => {});
    }
    clearAuthCookie(res, req);
    return res.status(403).json({ error: 'This username is no longer allowed.' });
  }
  const roleProfile = resolveProfileFromGroups(account?.username, groups);
  if (roleProfile && account) {
    account = await syncAccountFromProfile(account, roleProfile);
  }
  return res.json({ user: serializeAccount(account) });
});

exports.logout = asyncHandler(async (req, res) => {
  const sessionId = req.cookies?.[COOKIE_NAME] ? String(req.cookies[COOKIE_NAME]) : null;
  if (sessionId) {
    await Session.deleteOne({ sessionIdHash: hashSessionId(sessionId) }).catch(() => {});
  }
  clearAuthCookie(res, req);
  return res.json({ success: true });
});

exports.resetAccount = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  if (isLegacyExecutorUsername(username)) {
    return res.status(400).json({ error: 'Only admin accounts can be reset here.' });
  }

  const groups = await loadGroups();
  const resolved = resolveProfileFromGroups(username, groups);
  if (!resolved || resolved.isExecutor) {
    return res.status(400).json({ error: 'Only admin accounts can be reset here.' });
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
