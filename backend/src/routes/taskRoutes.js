const express = require('express');
const taskController = require('../controllers/taskController');
const { authenticate, requirePermission, requireAnyPermission } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', requireAnyPermission('viewTasks', 'manageTasks', 'viewOwnTasksOnly', 'manageOwnTasks'), taskController.listTasks);
router.get('/:id', requireAnyPermission('viewTasks', 'manageTasks', 'viewOwnTasksOnly', 'manageOwnTasks'), taskController.getTask);
router.post('/', requirePermission('manageTasks'), taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', requirePermission('manageTasks'), taskController.deleteTask);
router.patch('/:id/status', taskController.updateStatus);

module.exports = router;
