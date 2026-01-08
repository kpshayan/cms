const TeamMember = require('../models/TeamMember');
const Project = require('../models/Project');
const AccessGroup = require('../models/AccessGroup');
const asyncHandler = require('../utils/asyncHandler');

const normalizeUsername = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const serializeUser = (doc) => {
  const plain = doc.toObject({ versionKey: false });
  return {
    ...plain,
    id: plain._id,
  };
};

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await TeamMember.find().sort({ createdAt: -1 });
  return res.json(users.map(serializeUser));
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await TeamMember.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json(serializeUser(user));
});

exports.createUser = asyncHandler(async (req, res) => {
  const payload = {
    name: req.body.name,
    email: req.body.email,
    avatar: req.body.avatar,
    executorUsername: req.body.executorUsername,
    role: req.body.role,
    title: req.body.title,
    phone: req.body.phone,
    notes: req.body.notes,
  };

  if (!payload.name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  if (payload.email) {
    payload.email = payload.email.trim().toLowerCase();
  }
  if (payload.executorUsername) {
    payload.executorUsername = payload.executorUsername.trim().toLowerCase();
  }

  // New flow: username is derived from the team member name.
  // This becomes the executor login username and is added to admin3 allowlist.
  const derivedUsername = normalizeUsername(payload.name);
  payload.executorUsername = derivedUsername;

  if (!payload.avatar && payload.name) {
    payload.avatar = payload.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  // Ensure allowlist group exists and add derived username.
  await AccessGroup.updateOne(
    { key: 'admin3' },
    { $setOnInsert: { key: 'admin3', usernames: [] } },
    { upsert: true }
  );
  await AccessGroup.updateOne(
    { key: 'admin3' },
    { $addToSet: { usernames: derivedUsername } }
  );

  const user = await TeamMember.create(payload);
  return res.status(201).json(serializeUser(user));
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await TeamMember.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  Object.assign(user, req.body || {});
  await user.save();

  return res.json(serializeUser(user));
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await TeamMember.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  await Project.updateMany(
    { team: user._id },
    { $pull: { team: user._id } }
  );

  return res.json({ success: true });
});
