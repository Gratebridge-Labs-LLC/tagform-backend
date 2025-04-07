const authService = require('../services/authService');

class AuthController {
  /**
   * Handle user registration with email and password
   */
  async register(req, res) {
    try {
      const { email, password, fullName } = req.body;

      // Validate input
      if (!email || !password || !fullName) {
        return res.status(400).json({
          error: 'Email, password, and full name are required',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long',
        });
      }

      const data = await authService.signUpWithEmail(email, password, fullName);
      res.status(201).json(data);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle user login with email and password
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      const data = await authService.signInWithEmail(email, password);
      res.status(200).json(data);
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  }

  /**
   * Handle Google OAuth sign in
   */
  async googleSignIn(req, res) {
    try {
      const data = await authService.signInWithGoogle();
      res.status(200).json(data);
    } catch (error) {
      console.error('Google sign in error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle user logout
   */
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      await authService.signOut(token);
      res.status(200).json({ message: 'Successfully logged out' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      // req.user is set by the auth middleware
      res.status(200).json({ user: req.user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new AuthController(); 