const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authenticateUser } = require('../middleware/auth');
const formRoutes = require('./formRoutes');

// All workspace routes require authentication
router.use(authenticateUser);

// Create workspace
router.post('/', workspaceController.createWorkspace);

// Get workspaces with optional filters
router.get('/', workspaceController.getWorkspaces);

// Get single workspace
router.get('/:workspaceId', workspaceController.getWorkspace);

// Mount form routes
router.use('/:workspaceId/forms', formRoutes);

module.exports = router; 