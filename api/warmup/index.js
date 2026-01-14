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

  const startedAt = Date.now();

  try {
    // eslint-disable-next-line global-require
    const mongoose = require('mongoose');
    // eslint-disable-next-line global-require
    const bootstrap = require('../shared/bootstrap');

    await bootstrap();

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': req.headers?.origin || '*',
        'Vary': 'Origin',
      },
      body: {
        status: 'ok',
        warmed: true,
        durationMs: Date.now() - startedAt,
        db: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host || null,
        },
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': req.headers?.origin || '*',
        'Vary': 'Origin',
      },
      body: {
        status: 'error',
        warmed: false,
        durationMs: Date.now() - startedAt,
        error: {
          name: err?.name,
          code: err?.code,
          message: err?.message,
        },
      },
    };
  }
};
