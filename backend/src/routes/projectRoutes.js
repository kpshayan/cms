const express = require('express');
const projectController = require('../controllers/projectController');
const { authenticate, requirePermission, requireAnyPermission, requireAdmin1 } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('viewProjects'), projectController.listProjects);
router.get('/:id', requirePermission('viewProjects'), projectController.getProject);
router.post('/', requirePermission('manageProjects'), projectController.createProject);
router.put('/:id', requirePermission('manageProjects'), projectController.updateProject);
router.delete('/:id', requirePermission('manageProjects'), projectController.deleteProject);
router.post('/:id/team', requireAnyPermission('manageProjects', 'manageTeamMembers'), projectController.addTeamMember);
router.delete('/:id/team/:userId', requireAnyPermission('manageProjects', 'manageTeamMembers'), projectController.removeTeamMember);
router.get('/:id/quotations', requirePermission('viewProjects'), projectController.getProjectQuotations);
router.put('/:id/quotations', requireAdmin1, projectController.saveProjectQuotations);
router.get('/:id/quotations/pdf', requirePermission('viewProjects'), projectController.streamProjectQuotationsPdf);

module.exports = router;
