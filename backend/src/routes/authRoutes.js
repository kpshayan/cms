const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, requireAdmin1 } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/reset', authController.resetAccount);
router.get('/me', authenticate, authController.getProfile);
router.post('/logout', authenticate, authController.logout);

router.get('/executors', authenticate, authController.listExecutors);
router.post('/executors', authenticate, requireAdmin1, authController.createExecutor);
router.patch('/executors/:username', authenticate, requireAdmin1, authController.updateExecutor);
router.post('/executors/:username/reset-password', authenticate, requireAdmin1, authController.resetExecutorPassword);
router.delete('/executors/:username', authenticate, requireAdmin1, authController.deleteExecutor);

module.exports = router;
