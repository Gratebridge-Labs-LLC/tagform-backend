const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Initialize transporter in constructor
    this.initializeTestAccount();
  }

  async initializeTestAccount() {
    try {
      // Generate test SMTP service account
      const testAccount = await nodemailer.createTestAccount();
      
      // Create transporter with test credentials
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('Test email account created:', testAccount.user);
    } catch (error) {
      console.error('Error creating test email account:', error);
    }
  }

  /**
   * Send welcome email to new user
   * @param {string} email 
   * @param {string} fullName 
   */
  async sendWelcomeEmail(email, fullName) {
    try {
      if (!this.transporter) {
        await this.initializeTestAccount();
      }

      const info = await this.transporter.sendMail({
        from: '"TagForm Team" <noreply@tagform.com>',
        to: email,
        subject: 'Welcome to TagForm! 🎉',
        text: `Hi ${fullName},\n\nWelcome to TagForm! We're excited to have you on board.\n\nBest regards,\nThe TagForm Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to TagForm! 🎉</h2>
            <p>Hi ${fullName},</p>
            <p>Welcome to TagForm! We're excited to have you on board.</p>
            <p>Best regards,<br>The TagForm Team</p>
          </div>
        `
      });

      // Log the test email URL (only works in development)
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      return info;
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }
}

module.exports = new EmailService(); 