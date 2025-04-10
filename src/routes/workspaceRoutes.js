const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All workspace routes require authentication
router.use(authenticateToken);

// Create workspace
router.post('/', workspaceController.createWorkspace);

// Get workspaces with optional filters
router.get('/', workspaceController.getWorkspaces);

module.exports = router; 