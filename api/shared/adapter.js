const { parseCookies, serializeCookie } = require('./cookies');

const parseBody = (req) => {
  const body = req.body ?? req.rawBody;
  if (body == null) return undefined;
  if (typeof body === 'object') return body;
  if (Buffer.isBuffer(body)) {
    const text = body.toString('utf8');
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
};

const createReqRes = (context, req) => {
  const headers = req.headers || {};
  const cookieHeader = headers.cookie || headers.Cookie || '';

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
      const serialized = serializeCookie(name, value, options);
      const existing = this.headers['Set-Cookie'];
      if (!existing) {
        this.headers['Set-Cookie'] = serialized;
      } else if (Array.isArray(existing)) {
        this.headers['Set-Cookie'] = [...existing, serialized];
      } else {
        this.headers['Set-Cookie'] = [existing, serialized];
      }
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

  context.res = {
    status: res.statusCode,
    headers: res.headers,
    body,
    ...(isBuffer ? { isRaw: true } : {}),
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
  const message = err?.message || 'Server error';
  // Always send a JSON body so frontend fetch().json() doesn't throw.
  // Avoid leaking stack traces in production.
  const details = process.env.NODE_ENV === 'production'
    ? undefined
    : {
      name: err?.name,
      message: err?.message,
    };

  res.status(status).json({
    error: message,
    ...(details ? { details } : {}),
  });
};

module.exports = {
  createReqRes,
  finalizeResponse,
  runPipeline,
  sendError,
};
