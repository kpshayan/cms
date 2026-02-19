const mongoose = require('mongoose');

const connectDatabase = require('../backend/src/config/database');
const ensureAccessGroups = require('../backend/src/utils/ensureAccessGroups');

let initPromise;

module.exports = async function bootstrap() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing in the deployed environment. Add it in Static Web Apps -> Environment variables.');
    }
    try {
      if (mongoose.connection.readyState !== 1) {
        await connectDatabase();
      }
      await ensureAccessGroups();
    } catch (err) {
      // IMPORTANT: Reset initPromise so the next request retries
      // instead of returning the cached failed promise forever.
      initPromise = null;

      const message = err?.message || String(err);
      const wrapped = new Error(
        `API bootstrap failed (database/access groups). ${message} `
        + 'If this happens only in Azure, check MongoDB Atlas Network Access / IP allowlist and that the connection string is valid.'
      );
      wrapped.status = 500;
      wrapped.code = err?.code;
      throw wrapped;
    }
  })();

  return initPromise;
};
