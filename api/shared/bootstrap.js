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
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing in the deployed environment. Add it in Static Web Apps -> Environment variables.');
    }
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    await ensureAccessGroups();
  })();

  return initPromise;
};
