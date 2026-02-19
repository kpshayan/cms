const { parseCookies } = require('./cookies');

const parseBody = (req) => {
  const toTextIfPossible = (value) => {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    if (Buffer.isBuffer(value)) return value.toString('utf8');
    // Azure sometimes provides Uint8Array
    if (value instanceof Uint8Array) return Buffer.from(value).toString('utf8');
    return null;
  };

  const tryParseJson = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      // Fall back to form-encoded or SWA-transformed bodies.
      const trimmed = String(text || '').trim();

      // application/x-www-form-urlencoded
      if (trimmed.includes('=') && trimmed.includes('&') && !trimmed.startsWith('{')) {
        try {
          const params = new URLSearchParams(trimmed);
          const obj = {};
          for (const [k, v] of params.entries()) {
            obj[k] = v;
          }
          return obj;
        } catch {
          // ignore
        }
      }

      // Observed on SWA: JSON body arrives as a non-JSON string like
      // {username:phani,password:test123}
      // Parse that into an object.
      if (trimmed.startsWith('{') && trimmed.endsWith('}') && !trimmed.includes('"')) {
        const inner = trimmed.slice(1, -1).trim();
        if (!inner) return {};

        const obj = {};
        const parts = inner.split(',').map((p) => p.trim()).filter(Boolean);
        for (const part of parts) {
          const idx = part.indexOf(':');
          if (idx === -1) {
            return text;
          }
          const key = part.slice(0, idx).trim();
          const rawValue = part.slice(idx + 1).trim();
          if (!key) return text;

          let value = rawValue;
          if (rawValue === 'true') value = true;
          else if (rawValue === 'false') value = false;
          else if (rawValue !== '' && !Number.isNaN(Number(rawValue))) value = Number(rawValue);
          obj[key] = value;
        }
        return obj;
      }

      return text;
    }
  };

  // Prefer rawBody if present (SWA/Functions sometimes sets req.body to {} even when rawBody has data)
  const rawText = toTextIfPossible(req.rawBody);
  if (rawText != null && rawText !== '') {
    return tryParseJson(rawText);
  }

  const bodyText = toTextIfPossible(req.body);
  if (bodyText != null && bodyText !== '') {
    return tryParseJson(bodyText);
  }

  const body = req.body;
  if (body == null) return undefined;

  // If body is an empty plain object, treat it as missing.
  if (typeof body === 'object' && body.constructor === Object && Object.keys(body).length === 0) {
    return undefined;
  }

  return body;
};

const createReqRes = (context, req) => {
  const incomingHeaders = req.headers || {};
  const headers = {};
  for (const [key, value] of Object.entries(incomingHeaders)) {
    headers[String(key).toLowerCase()] = value;
  }
  const cookieHeader = headers.cookie || '';

  const expressReq = {
    method: req.method,
    headers,
    query: req.query || {},
    body: parseBody(req),
    params: { ...(context.bindingData || {}) },
    cookies: parseCookies(cookieHeader),
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(payload) {
      if (!this.headers['Content-Type']) {
        this.headers['Content-Type'] = 'application/json';
      }
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value, options = {}) {
      if (!this._cookies) this._cookies = [];
      this._cookies.push({ name, value: String(value ?? ''), options });
      return this;
    },
    clearCookie(name, options = {}) {
      const opts = {
        ...options,
        expires: new Date(0),
        maxAge: 0,
      };
      return this.cookie(name, '', opts);
    },
  };

  return { expressReq, res };
};

const finalizeResponse = (context, res) => {
  const body = res.body;
  const isBuffer = Buffer.isBuffer(body);

  // Build Azure Functions native cookies array.
  // Azure SWA managed functions do NOT reliably forward raw Set-Cookie headers,
  // but context.res.cookies is the officially supported mechanism.
  const normalizeSameSite = (v) => {
    const s = String(v || 'Lax').toLowerCase();
    if (s === 'none') return 'None';
    if (s === 'strict') return 'Strict';
    return 'Lax';
  };

  const cookies = (res._cookies || []).map(({ name, value, options }) => {
    const entry = {
      name,
      value: String(value ?? ''),
      path: options.path || '/',
      httpOnly: Boolean(options.httpOnly),
      secure: Boolean(options.secure),
      sameSite: normalizeSameSite(options.sameSite),
    };
    if (options.maxAge != null) {
      entry.maxAge = Math.max(0, Math.floor(options.maxAge / 1000));
    }
    if (options.expires) {
      entry.expires = new Date(options.expires);
    }
    if (options.domain) {
      entry.domain = options.domain;
    }
    return entry;
  });

  const headers = { ...res.headers };
  delete headers['Set-Cookie'];

  context.res = {
    status: res.statusCode,
    headers,
    body,
    ...(isBuffer ? { isRaw: true } : {}),
    ...(cookies.length ? { cookies } : {}),
  };
};

const runPipeline = async (req, res, handlers) => {
  let index = -1;
  const next = async (err) => {
    if (err) throw err;
    index += 1;
    const fn = handlers[index];
    if (!fn) return;
    await fn(req, res, next);
  };
  await next();
};

const sendError = (res, err) => {
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || (err ? String(err) : '') || 'Server error';

  // Always send a JSON body so frontend fetch().json() doesn't throw.
  // In production, include only safe diagnostic fields (no stack traces).
  const details = {
    name: err?.name,
    code: err?.code,
    message: err?.message,
  };
  const includeDetails = process.env.NODE_ENV !== 'production' || status >= 500;

  res.status(status).json({
    error: message,
    ...(includeDetails ? { details } : {}),
  });
};

module.exports = {
  createReqRes,
  finalizeResponse,
  runPipeline,
  sendError,
};
