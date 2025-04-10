const { createClient } = require('@supabase/supabase-js');
const emailService = require('./emailService');
require('dotenv').config();

class AuthService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  /**
   * Sign up a new user with email and password
   * @param {string} email 
   * @param {string} password 
   * @param {string} fullName 
   */
  async signUpWithEmail(email, password, fullName) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        },
      });

      if (error) throw error;

      // Send welcome email
      await emailService.sendWelcomeEmail(email, fullName);

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sign in a user with email and password
   * @param {string} email 
   * @param {string} password 
   */
  async signInWithEmail(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sign in or sign up a user with Google
   */
  async signInWithGoogle() {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.CLIENT_URL}/auth/callback`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sign out a user
   * @param {string} accessToken 
   */
  async signOut(accessToken) {
    try {
      const { error } = await this.supabase.auth.signOut({
        accessToken,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by access token
   * @param {string} accessToken 
   */
  async getUser(accessToken) {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(accessToken);

      if (error) throw error;
      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService(); 