require('dotenv').config();
const connectDatabase = require('../config/database');
const ensureAccessGroups = require('../utils/ensureAccessGroups');

(async () => {
  try {
    await connectDatabase();
    const force = process.argv.includes('--force');
    await ensureAccessGroups({ force });
    console.log(`Access groups ensured: admin1, admin2, admin3, admin4${force ? ' (forced reset)' : ''}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed access groups', err);
    process.exit(1);
  }
})();
