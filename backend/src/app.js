const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const defaultOrigin = process.env.DEFAULT_CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigins = allowedOrigins.length ? allowedOrigins : [defaultOrigin];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(helmet());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/warmup', (req, res) => {
  res.json({ status: 'ok', warmed: true, timestamp: new Date().toISOString() });
});

app.get('/api/diag', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    node: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV || null,
      hasMONGODB_URI: Boolean(process.env.MONGODB_URI),
      hasJWT_SECRET: Boolean(process.env.JWT_SECRET),
      hasADMIN1_USERNAMES: Boolean(process.env.ADMIN1_USERNAMES),
    },
    db: {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || null,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

module.exports = app;
