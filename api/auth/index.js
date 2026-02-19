const bootstrap = require('../shared/bootstrap');
const { createReqRes, finalizeResponse, runPipeline, sendError } = require('../shared/adapter');

const authController = require('../backend/src/controllers/authController');
const { authenticate, requireAdmin1 } = require('../backend/src/middleware/auth');

const withCors = (req, res) => {
  const origin = req.headers?.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
};

module.exports = async function (context, req) {
  const { expressReq, res } = createReqRes(context, req);
  withCors(expressReq, res);

  if (String(expressReq.method || '').toUpperCase() === 'OPTIONS') {
    res.status(204).send('');
    return finalizeResponse(context, res);
  }

  try {
    await bootstrap();

    const pathRaw = String(context.bindingData?.path || '').replace(/^\/+/, '');
    const segments = pathRaw.split('/').filter(Boolean);
    const method = String(expressReq.method || '').toUpperCase();

    let handlers = null;

    // POST /api/auth/signup
    if (method === 'POST' && segments[0] === 'signup') {
      handlers = [authController.signup];
    }

    // POST /api/auth/login
    if (method === 'POST' && segments[0] === 'login') {
      handlers = [authController.login];
    }

    // POST /api/auth/reset
    if (method === 'POST' && segments[0] === 'reset') {
      handlers = [authController.resetAccount];
    }

    // GET /api/auth/me
    if (method === 'GET' && segments[0] === 'me') {
      handlers = [authenticate, authController.getProfile];
    }

    // POST /api/auth/logout
    if (method === 'POST' && segments[0] === 'logout') {
      handlers = [authenticate, authController.logout];
    }

    // GET /api/auth/roles
    if (method === 'GET' && segments[0] === 'roles') {
      handlers = [authenticate, requireAdmin1, authController.getRoleAssignments];
    }

    // POST /api/auth/roles/assign
    if (method === 'POST' && segments[0] === 'roles' && segments[1] === 'assign') {
      handlers = [authenticate, requireAdmin1, authController.assignRole];
    }

    // Executors
    // GET /api/auth/executors
    if (method === 'GET' && segments[0] === 'executors') {
      handlers = [authenticate, authController.listExecutors];
    }

    // POST /api/auth/executors
    if (method === 'POST' && segments[0] === 'executors' && segments.length === 1) {
      handlers = [authenticate, requireAdmin1, authController.createExecutor];
    }

    // PATCH /api/auth/executors/:username
    if (method === 'PATCH' && segments[0] === 'executors' && segments[1] && segments.length === 2) {
      expressReq.params.username = segments[1];
      handlers = [authenticate, requireAdmin1, authController.updateExecutor];
    }

    // POST /api/auth/executors/:username/reset-password
    if (method === 'POST' && segments[0] === 'executors' && segments[1] && segments[2] === 'reset-password') {
      expressReq.params.username = segments[1];
      handlers = [authenticate, requireAdmin1, authController.resetExecutorPassword];
    }

    // DELETE /api/auth/executors/:username
    if (method === 'DELETE' && segments[0] === 'executors' && segments[1] && segments.length === 2) {
      expressReq.params.username = segments[1];
      handlers = [authenticate, requireAdmin1, authController.deleteExecutor];
    }

    if (!handlers) {
      res.status(404).json({ error: 'Not found' });
      return finalizeResponse(context, res);
    }

    await runPipeline(expressReq, res, handlers);
  } catch (err) {
    context.log.error('[auth]', err?.message || err);
    sendError(res, err);
  }

  return finalizeResponse(context, res);
};
