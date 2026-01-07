const mongoose = require('mongoose');

const connectDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true,
    });
    const { host } = mongoose.connection;
    console.log(`MongoDB connected: ${host}`);
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    throw err;
  }
};

module.exports = connectDatabase;
