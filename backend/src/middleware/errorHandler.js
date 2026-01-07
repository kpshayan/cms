// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return res.end();
  }
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  return res.status(status).json({ error: message });
};

module.exports = errorHandler;
