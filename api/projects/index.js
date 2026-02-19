const bootstrap = require('../shared/bootstrap');
const { createReqRes, finalizeResponse, runPipeline, sendError } = require('../shared/adapter');

const projectController = require('../backend/src/controllers/projectController');
const { authenticate, requirePermission, requireAnyPermission, requireAdmin1 } = require('../backend/src/middleware/auth');

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

    // All project routes require auth in the Express app; keep same.

    // GET /api/projects
    if (method === 'GET' && segments.length === 0) {
      handlers = [authenticate, requirePermission('viewProjects'), projectController.listProjects];
    }

    // POST /api/projects
    if (method === 'POST' && segments.length === 0) {
      handlers = [authenticate, requirePermission('manageProjects'), projectController.createProject];
    }

    // GET /api/projects/:id
    if (method === 'GET' && segments[0] && segments.length === 1) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requirePermission('viewProjects'), projectController.getProject];
    }

    // PUT /api/projects/:id
    if (method === 'PUT' && segments[0] && segments.length === 1) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requirePermission('manageProjects'), projectController.updateProject];
    }

    // DELETE /api/projects/:id
    if (method === 'DELETE' && segments[0] && segments.length === 1) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requirePermission('manageProjects'), projectController.deleteProject];
    }

    // POST /api/projects/:id/team
    if (method === 'POST' && segments[0] && segments[1] === 'team') {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requireAnyPermission('manageProjects', 'manageTeamMembers'), projectController.addTeamMember];
    }

    // DELETE /api/projects/:id/team/:userId
    if (method === 'DELETE' && segments[0] && segments[1] === 'team' && segments[2]) {
      expressReq.params.id = segments[0];
      expressReq.params.userId = segments[2];
      handlers = [authenticate, requireAnyPermission('manageProjects', 'manageTeamMembers'), projectController.removeTeamMember];
    }

    // POST /api/projects/:id/comments
    if (method === 'POST' && segments[0] && segments[1] === 'comments') {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requirePermission('viewProjects'), projectController.addProjectComment];
    }

    // DELETE /api/projects/:id/comments/:commentId
    if (method === 'DELETE' && segments[0] && segments[1] === 'comments' && segments[2]) {
      expressReq.params.id = segments[0];
      expressReq.params.commentId = segments[2];
      handlers = [authenticate, requirePermission('viewProjects'), projectController.deleteProjectComment];
    }

    // GET /api/projects/:id/quotations
    if (method === 'GET' && segments[0] && segments[1] === 'quotations' && segments.length === 2) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requirePermission('viewProjects'), projectController.getProjectQuotations];
    }

    // PUT /api/projects/:id/quotations
    if (method === 'PUT' && segments[0] && segments[1] === 'quotations' && segments.length === 2) {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requireAdmin1, projectController.saveProjectQuotations];
    }

    // GET /api/projects/:id/quotations/pdf
    if (method === 'GET' && segments[0] && segments[1] === 'quotations' && segments[2] === 'pdf') {
      expressReq.params.id = segments[0];
      handlers = [authenticate, requirePermission('viewProjects'), projectController.streamProjectQuotationsPdf];
    }

    // GET /api/projects/:id/quotations/versions/:versionId/pdf
    if (method === 'GET' && segments[0] && segments[1] === 'quotations' && segments[2] === 'versions' && segments[3] && segments[4] === 'pdf') {
      expressReq.params.id = segments[0];
      expressReq.params.versionId = segments[3];
      handlers = [authenticate, requirePermission('viewProjects'), projectController.streamProjectQuotationVersionPdf];
    }

    if (!handlers) {
      res.status(404).json({ error: 'Not found' });
      return finalizeResponse(context, res);
    }

    await runPipeline(expressReq, res, handlers);
  } catch (err) {
    context.log.error('[projects]', err?.message || err);
    sendError(res, err);
  }

  return finalizeResponse(context, res);
};
