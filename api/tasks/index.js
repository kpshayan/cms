const bootstrap = require('../shared/bootstrap');
const { createReqRes, finalizeResponse, runPipeline, sendError } = require('../shared/adapter');

const taskController = require('../backend/src/controllers/taskController');
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

    // GET /api/tasks
    if (method === 'GET' && segments.length === 0) {
      handlers = [authenticate, requireAnyPermission('viewTasks', 'manageTasks', 'viewOwnTasksOnly', 'manageOwnTasks'), taskController.listTasks];
    }

    // POST /api/tasks
    if (method === 'POST' && segments.length === 0) {
      handlers = [authenticate, requirePermission('manageTasks'), taskController.createTask];
    }

    // GET /api/tasks/:id
    if (method === 'GET' && segments[0] && segments.length === 1) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requireAnyPermission('viewTasks', 'manageTasks', 'viewOwnTasksOnly', 'manageOwnTasks'), taskController.getTask];
    }

    // PUT /api/tasks/:id
    if (method === 'PUT' && segments[0] && segments.length === 1) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, taskController.updateTask];
    }

    // DELETE /api/tasks/:id
    if (method === 'DELETE' && segments[0] && segments.length === 1) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requirePermission('manageTasks'), taskController.deleteTask];
    }

    // PATCH /api/tasks/:id/status
    if (method === 'PATCH' && segments[0] && segments[1] === 'status') {
      expressReq.params.id = segments[0];
      handlers = [authenticate, taskController.updateStatus];
    }

    // POST /api/tasks/:id/comments
    if (method === 'POST' && segments[0] && segments[1] === 'comments') {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requireAnyPermission('viewTasks', 'manageTasks', 'viewOwnTasksOnly', 'manageOwnTasks'), taskController.addComment];
    }

    // DELETE /api/tasks/:id/comments/:commentId
    if (method === 'DELETE' && segments[0] && segments[1] === 'comments' && segments[2]) {
      expressReq.params.id = segments[0];
      expressReq.params.commentId = segments[2];
      handlers = [authenticate, requireAnyPermission('viewTasks', 'manageTasks', 'viewOwnTasksOnly', 'manageOwnTasks'), taskController.deleteComment];
    }

    if (!handlers) {
      res.status(404).json({ error: 'Not found' });
      return finalizeResponse(context, res);
    }

    await runPipeline(expressReq, res, handlers);
  } catch (err) {
    sendError(res, err);
  }

  return finalizeResponse(context, res);
};
