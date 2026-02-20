const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, requirePermission, requireAnyPermission } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('viewProjects'), userController.listUsers);
router.get('/:id', requirePermission('viewProjects'), userController.getUser);
router.post('/', requireAnyPermission('manageProjects', 'manageTeamMembers'), userController.createUser);
router.put('/:id', requireAnyPermission('manageProjects', 'manageTeamMembers'), userController.updateUser);
router.delete('/:id', requireAnyPermission('manageProjects', 'manageTeamMembers'), userController.deleteUser);

module.exports = router;
