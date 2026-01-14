module.exports = async function (context, req) {
  const crypto = require('crypto');
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

  const preview = (value, max = 800) => {
    if (value == null) return null;
    try {
      const text = typeof value === 'string'
        ? value
        : Buffer.isBuffer(value)
          ? value.toString('utf8')
          : value instanceof Uint8Array
            ? Buffer.from(value).toString('utf8')
            : JSON.stringify(value);
      return text.length > max ? `${text.slice(0, max)}...` : text;
    } catch {
      return null;
    }
  };

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

  const payload = {
    node: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV || null,
      hasMONGODB_URI: Boolean(process.env.MONGODB_URI),
      hasJWT_SECRET: Boolean(process.env.JWT_SECRET),
      jwtSecretLength: process.env.JWT_SECRET ? String(process.env.JWT_SECRET).length : 0,
      jwtSecretFingerprint: process.env.JWT_SECRET
        ? crypto.createHash('sha256').update(String(process.env.JWT_SECRET)).digest('hex').slice(0, 12)
        : null,
      hasADMIN1_USERNAMES: Boolean(process.env.ADMIN1_USERNAMES),
    },
    modules: {
      bcryptjs: tryRequire('bcryptjs'),
      jsonwebtoken: tryRequire('jsonwebtoken'),
      mongoose: tryRequire('mongoose'),
    },
  };

  if (method === 'POST') {
    const headers = req.headers || {};
    payload.request = {
      method,
      headers: {
        'content-type': headers['content-type'] || headers['Content-Type'] || null,
        'content-length': headers['content-length'] || headers['Content-Length'] || null,
      },
      bodyType: req.body == null ? null : typeof req.body,
      rawBodyType: req.rawBody == null ? null : typeof req.rawBody,
      bodyPreview: preview(req.body),
      rawBodyPreview: preview(req.rawBody),
    };
  }

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
