const express = require('express');
const router = express.Router({ mergeParams: true });
const formController = require('../controllers/formController');
const { authenticateUser } = require('../middleware/auth');
const formService = require('../services/formService');

// ============= Public Routes (No Auth Required) =============

// Test route to verify service is working
router.get('/test', (req, res) => {
  res.json({ message: 'Form service is running' });
});

// Public submission routes - these must come BEFORE the workspace/form route to avoid conflicts
router.post('/:formId/submissions/start', formController.startSubmission);
router.post('/:formId/submissions/:submissionId/complete', formController.completeSubmission);
router.get('/:formId/submissions/list', async (req, res) => {
  try {
    const { formId } = req.params;
    const { page, limit, sortBy, sortOrder } = req.query;
    
    const result = await formService.listSubmissionsWithDetails(formId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'desc'
    });
    
    res.json(result);
  } catch (error) {
    console.error('[FormRoutes] Error listing submissions with details:', error);
    res.status(500).json({ 
      error: 'Failed to list submissions',
      message: error.message 
    });
  }
});

// Public route to access form by workspace and form name
router.get('/:workspaceSlug/:formSlug', async (req, res) => {
  const startTime = Date.now();
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.connection.remoteAddress;
  const referrer = req.headers.referer || req.headers.referrer || 'direct';

  // Log the incoming request
  console.log(`[Form Access] New request at ${new Date().toISOString()}:`, {
    workspace: req.params.workspaceSlug,
    form: req.params.formSlug,
    ip: ipAddress,
    userAgent,
    referrer,
    params: req.params,
    query: req.query
  });

  try {
    if (!req.params.workspaceSlug || !req.params.formSlug) {
      throw new Error('Missing required parameters');
    }

    const path = `${req.params.workspaceSlug}/${req.params.formSlug}`;
    const form = await formService.getFormByPath(path);
    
    const duration = Date.now() - startTime;
    console.log(`[Form Access] Success - Form "${form.name}" accessed (took ${duration}ms):`, {
      formId: form.id,
      workspace: req.params.workspaceSlug,
      form: req.params.formSlug,
      questionsCount: form.questions?.length || 0
    });

    res.json(form);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Form Access] Error getting form by path:', {
      workspace: req.params.workspaceSlug,
      form: req.params.formSlug,
      error: error.message,
      stack: error.stack,
      duration
    });

    // Send appropriate error response
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Form not found',
        details: error.message
      });
    } else if (error.message.includes('Invalid')) {
      res.status(400).json({
        error: 'Bad request',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        details: 'An unexpected error occurred'
      });
    }
  }
});

// ============= Protected Routes (Auth Required) =============
router.use(authenticateUser);

// Form management routes
router.get('/', formController.listForms);
router.post('/', formController.createForm);
router.get('/:formId', formController.getForm);
router.put('/:formId', formController.updateForm);
router.delete('/:formId', formController.deleteForm);

// Question management routes
router.post('/:formId/questions', formController.createQuestion);
router.put('/:formId/questions/:questionId', formController.updateQuestion);
router.delete('/:formId/questions/:questionId', formController.deleteQuestion);
router.post('/:formId/questions/reorder', formController.reorderQuestions);

// Question choices routes
router.get('/:formId/questions/:questionId/choices', formController.getQuestionChoices);
router.post('/:formId/questions/:questionId/choices', formController.createQuestionChoice);
router.put('/:formId/questions/:questionId/choices/:choiceId', formController.updateQuestionChoice);
router.delete('/:formId/questions/:questionId/choices/:choiceId', formController.deleteQuestionChoice);
router.post('/:formId/questions/:questionId/choices/reorder', formController.reorderQuestionChoices);

// Form settings routes
router.get('/:formId/settings', formController.getFormSettings);
router.put('/:formId/settings', formController.updateFormSettings);

// Submission management routes (admin only)
router.get('/:formId/submissions', formController.listSubmissions);
router.get('/:formId/submissions/:submissionId', formController.getSubmission);

// Analytics routes
router.get('/:formId/analytics', formController.getFormAnalytics);
router.get('/:formId/questions/:questionId/analytics', formController.getQuestionAnalytics);
router.get('/:formId/analytics/export', formController.exportAnalytics);

module.exports = router; 