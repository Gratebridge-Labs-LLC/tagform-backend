const workspaceService = require('../services/workspaceService');

class WorkspaceController {
  /**
   * Create a new workspace
   */
  async createWorkspace(req, res) {
    try {
      const { name, type } = req.body;
      const userId = req.user.id;  // Set by auth middleware

      // Validate input
      if (!name) {
        return res.status(400).json({ error: 'Workspace name is required' });
      }

      if (type && !['private', 'public'].includes(type)) {
        return res.status(400).json({ error: 'Type must be either private or public' });
      }

      const workspace = await workspaceService.createWorkspace(
        name,
        type || 'private',
        userId
      );

      res.status(201).json(workspace);
    } catch (error) {
      console.error('Create workspace error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get workspaces with filters
   */
  async getWorkspaces(req, res) {
    try {
      const userId = req.user.id;  // Set by auth middleware
      const { type, search, page, limit } = req.query;

      const result = await workspaceService.getWorkspaces(userId, {
        type,
        search,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Get workspaces error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get a single workspace by ID
   */
  async getWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;  // Set by auth middleware

      const workspace = await workspaceService.getWorkspace(workspaceId, userId);
      
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json(workspace);
    } catch (error) {
      console.error('Get workspace error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new WorkspaceController(); 