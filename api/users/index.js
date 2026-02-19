const bootstrap = require('../shared/bootstrap');
const { createReqRes, finalizeResponse, runPipeline, sendError } = require('../shared/adapter');

const userController = require('../backend/src/controllers/userController');
const { authenticate, requirePermission, requireAnyPermission } = require('../backend/src/middleware/auth');

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

    // GET /api/users
    if (method === 'GET' && segments.length === 0) {
      handlers = [authenticate, requirePermission('viewProjects'), userController.listUsers];
    }

    // POST /api/users
    if (method === 'POST' && segments.length === 0) {
      handlers = [authenticate, requireAnyPermission('manageProjects', 'manageTeamMembers'), userController.createUser];
    }

    // GET /api/users/:id
    if (method === 'GET' && segments[0] && segments.length === 1) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requirePermission('viewProjects'), userController.getUser];
    }

    // PUT /api/users/:id
    if (method === 'PUT' && segments[0] && segments.length === 1) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requireAnyPermission('manageProjects', 'manageTeamMembers'), userController.updateUser];
    }

    // DELETE /api/users/:id
    if (method === 'DELETE' && segments[0] && segments.length === 1) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requireAnyPermission('manageProjects', 'manageTeamMembers'), userController.deleteUser];
    }

    if (!handlers) {
      res.status(404).json({ error: 'Not found' });
      return finalizeResponse(context, res);
    }

    await runPipeline(expressReq, res, handlers);
  } catch (err) {
    context.log.error('[users]', err?.message || err);
    sendError(res, err);
  }

  return finalizeResponse(context, res);
};
