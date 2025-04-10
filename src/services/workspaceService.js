const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class WorkspaceService {
  constructor() {
    // Create a Supabase client with the service role key for admin operations
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Create a new workspace
   * @param {string} name 
   * @param {string} type - 'private' or 'public'
   * @param {string} userId 
   */
  async createWorkspace(name, type, userId) {
    try {
      const { data, error } = await this.supabase
        .from('workspaces')
        .insert([
          { name, type, user_id: userId }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get workspaces with optional filters
   * @param {string} userId 
   * @param {Object} options
   * @param {string} options.type - Filter by type ('private' or 'public')
   * @param {string} options.search - Search by name
   * @param {number} options.page - Page number for pagination
   * @param {number} options.limit - Items per page
   */
  async getWorkspaces(userId, options = {}) {
    try {
      let query = this.supabase
        .from('workspaces')
        .select('*', { count: 'exact' });

      // Filter by type if specified
      if (options.type) {
        query = query.eq('type', options.type);
      }

      // Filter to show only user's private workspaces and all public workspaces
      query = query.or(`user_id.eq.${userId},type.eq.public`);

      // Search by name if specified
      if (options.search) {
        query = query.ilike('name', `%${options.search}%`);
      }

      // Add pagination
      const page = options.page || 1;
      const limit = options.limit || 10;
      const start = (page - 1) * limit;
      
      query = query
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      
      return {
        workspaces: data,
        pagination: {
          page,
          limit,
          total: count
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single workspace by ID
   * @param {string} workspaceId 
   * @param {string} userId 
   */
  async getWorkspace(workspaceId, userId) {
    try {
      const { data, error } = await this.supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .or(`user_id.eq.${userId},type.eq.public`)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new WorkspaceService(); 