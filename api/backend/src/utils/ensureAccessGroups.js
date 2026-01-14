const AccessGroup = require('../models/AccessGroup');

const normalizeUsername = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const parseUsernames = (value) => String(value || '')
  .split(',')
  .map((item) => normalizeUsername(item))
  .filter(Boolean);

const withFallback = (primary, fallback) => {
  const list = parseUsernames(primary);
  return list.length ? list : fallback;
};

const DEFAULT_GROUPS = [
  // Seed allowlist usernames for initial bootstrap.
  // Configure these per environment (Azure Static Web Apps -> Environment variables).
  // Example values:
  //   ADMIN1_USERNAMES=phani,anand
  //   ADMIN2_USERNAMES=admin2
  //   ADMIN4_USERNAMES=viewer1
  // If not provided, it falls back to the legacy defaults (admin1/admin2/admin4).
  { key: 'admin1', usernames: withFallback(process.env.ADMIN1_USERNAMES, ['admin1']) },
  { key: 'admin2', usernames: withFallback(process.env.ADMIN2_USERNAMES, ['admin2']) },
  { key: 'admin3', usernames: [] },
  { key: 'admin4', usernames: withFallback(process.env.ADMIN4_USERNAMES, ['admin4']) },
];

const ensureAccessGroups = async ({ force = false } = {}) => {
  await Promise.all(DEFAULT_GROUPS.map(async ({ key, usernames }) => {
    const list = Array.isArray(usernames) ? usernames.filter(Boolean) : [];

    if (force) {
      await AccessGroup.updateOne(
        { key },
        { $set: { key, usernames: list } },
        { upsert: true }
      );
      return;
    }

    // Upsert group doc.
    await AccessGroup.updateOne(
      { key },
      { $setOnInsert: { key, usernames: [] } },
      { upsert: true }
    );

    // Ensure baseline usernames exist.
    if (list.length) {
      await AccessGroup.updateOne(
        { key },
        { $addToSet: { usernames: { $each: list } } }
      );
    }
  }));
};

module.exports = ensureAccessGroups;
