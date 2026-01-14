module.exports = async function (context, req) {
  const method = String(req.method || '').toUpperCase();
  if (method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': req.headers?.origin || '*',
        'Vary': 'Origin',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
      },
      body: '',
    };
    return;
  }

  const tryRequire = (name) => {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      require(name);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: {
          name: err?.name,
          message: err?.message,
        },
      };
    }
  };

  const checkDb = (() => {
    const raw = req.query?.checkDb ?? req.query?.db ?? req.query?.checkdb;
    if (raw == null) return false;
    const normalized = String(raw).trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  })();

  const db = {
    checkRequested: checkDb,
    readyState: null,
    host: null,
    error: null,
  };

  if (checkDb) {
    try {
      // eslint-disable-next-line global-require
      const mongoose = require('mongoose');
      // eslint-disable-next-line global-require
      const bootstrap = require('../shared/bootstrap');
      await bootstrap();
      db.readyState = mongoose.connection.readyState;
      db.host = mongoose.connection.host || null;
    } catch (err) {
      db.error = {
        name: err?.name,
        code: err?.code,
        message: err?.message,
      };
    }
  }

  const payload = {
    node: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV || null,
      hasMONGODB_URI: Boolean(process.env.MONGODB_URI),
      hasJWT_SECRET: Boolean(process.env.JWT_SECRET),
      hasADMIN1_USERNAMES: Boolean(process.env.ADMIN1_USERNAMES),
    },
    db,
    modules: {
      bcryptjs: tryRequire('bcryptjs'),
      jsonwebtoken: tryRequire('jsonwebtoken'),
      mongoose: tryRequire('mongoose'),
    },
  };

  context.res = {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': req.headers?.origin || '*',
      'Vary': 'Origin',
    },
    body: payload,
  };
};
