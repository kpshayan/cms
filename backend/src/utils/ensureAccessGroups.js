const AccessGroup = require('../models/AccessGroup');

const DEFAULT_GROUPS = [
  { key: 'admin1', usernames: [] },
  { key: 'admin2', usernames: [] },
  { key: 'admin3', usernames: [] },
  { key: 'admin4', usernames: [] },
];

const ensureAccessGroups = async ({ force = false } = {}) => {
  await Promise.all(DEFAULT_GROUPS.map(async ({ key, usernames }) => {
    const existing = await AccessGroup.findOne({ key });
    if (!existing) {
      await AccessGroup.create({ key, usernames });
      return;
    }
    if (force) {
      existing.usernames = usernames;
      await existing.save();
    }
  }));
};

module.exports = ensureAccessGroups;
