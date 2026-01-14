const parseCookies = (cookieHeader = '') => {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    if (!part) continue;
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = decodeURIComponent(part.slice(0, index).trim());
    const value = decodeURIComponent(part.slice(index + 1).trim());
    if (key) out[key] = value;
  }
  return out;
};

const serializeCookie = (name, value, options = {}) => {
  const segments = [`${encodeURIComponent(name)}=${encodeURIComponent(value ?? '')}`];

  if (options.maxAge != null) segments.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  if (options.expires) segments.push(`Expires=${new Date(options.expires).toUTCString()}`);
  if (options.domain) segments.push(`Domain=${options.domain}`);
  if (options.path) segments.push(`Path=${options.path}`);

  if (options.httpOnly) segments.push('HttpOnly');
  if (options.secure) segments.push('Secure');

  if (options.sameSite) {
    const raw = String(options.sameSite).toLowerCase();
    const normalized = raw === 'none' ? 'None' : raw === 'strict' ? 'Strict' : 'Lax';
    segments.push(`SameSite=${normalized}`);
  }

  return segments.join('; ');
};

module.exports = {
  parseCookies,
  serializeCookie,
};
