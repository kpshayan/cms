const mongoose = require('mongoose');

const connectDatabase = require('../../backend/src/config/database');
const ensureAccessGroups = require('../../backend/src/utils/ensureAccessGroups');

let initPromise;

module.exports = async function bootstrap() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    await ensureAccessGroups();
  })();

  return initPromise;
};
