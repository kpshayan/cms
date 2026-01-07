require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/database');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`API ready on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Server startup failed', err);
    process.exit(1);
  }
})();
