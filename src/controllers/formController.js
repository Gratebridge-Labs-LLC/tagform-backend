const formService = require('../services/formService');

class FormController {
  /**
   * List forms in a workspace
   */
  async listForms(req, res) {
    try {
      const { workspaceId } = req.params;
      const { page, limit } = req.query;
      
      const result = await formService.listForms(workspaceId, { page, limit });
      res.json(result);
    } catch (error) {
      console.error('Error listing forms:', error);
      res.status(500).json({ error: 'Failed to list forms' });
    }
  }

  /**
   * Create a new form
   */
  async createForm(req, res) {
    try {
      const { workspaceId } = req.params;
      const { name, description, is_private } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Form name is required' });
      }

      const form = await formService.createForm(workspaceId, {
        name,
        description,
        is_private: is_private ?? false
      });

      res.status(201).json(form);
    } catch (error) {
      console.error('Error creating form:', error);
      res.status(500).json({ error: 'Failed to create form' });
    }
  }

  /**
   * Get form details
   */
  async getForm(req, res) {
    try {
      const { formId } = req.params;
      const form = await formService.getForm(formId);

      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

      res.json(form);
    } catch (error) {
      console.error('Error getting form:', error);
      res.status(500).json({ error: 'Failed to get form' });
    }
  }

  /**
   * Update form
   */
  async updateForm(req, res) {
    try {
      const { formId } = req.params;
      const { name, description, is_private } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Form name is required' });
      }

      const form = await formService.updateForm(formId, {
        name,
        description,
        is_private
      });

      res.json(form);
    } catch (error) {
      console.error('Error updating form:', error);
      res.status(500).json({ error: 'Failed to update form' });
    }
  }

  /**
   * Delete form
   */
  async deleteForm(req, res) {
    try {
      const { formId } = req.params;
      await formService.deleteForm(formId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting form:', error);
      res.status(500).json({ error: 'Failed to delete form' });
    }
  }

  /**
   * Create question
   */
  async createQuestion(req, res) {
    try {
      const { formId } = req.params;
      const { type, text, description, is_required, max_chars, choices } = req.body;

      if (!type || !text) {
        return res.status(400).json({ error: 'Question type and text are required' });
      }

      const question = await formService.createQuestion(formId, {
        type,
        text,
        description,
        is_required: is_required ?? false,
        max_chars,
        choices
      });

      res.status(201).json(question);
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({ error: 'Failed to create question' });
    }
  }

  /**
   * Update question
   */
  async updateQuestion(req, res) {
    try {
      const { questionId } = req.params;
      const { text, description, is_required, max_chars, choices } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Question text is required' });
      }

      const question = await formService.updateQuestion(questionId, {
        text,
        description,
        is_required,
        max_chars,
        choices
      });

      res.json(question);
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }

  /**
   * Delete question
   */
  async deleteQuestion(req, res) {
    try {
      const { questionId } = req.params;
      await formService.deleteQuestion(questionId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }

  /**
   * Reorder questions
   */
  async reorderQuestions(req, res) {
    try {
      const { formId } = req.params;
      const { questionIds } = req.body;

      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({ error: 'Question IDs array is required' });
      }

      await formService.reorderQuestions(formId, questionIds);
      res.status(204).send();
    } catch (error) {
      console.error('Error reordering questions:', error);
      res.status(500).json({ error: 'Failed to reorder questions' });
    }
  }

  /**
   * Get form settings
   */
  async getFormSettings(req, res) {
    try {
      const { formId } = req.params;
      const settings = await formService.getFormSettings(formId);

      if (!settings) {
        return res.status(404).json({ error: 'Form settings not found' });
      }

      res.json(settings);
    } catch (error) {
      console.error('Error getting form settings:', error);
      res.status(500).json({ error: 'Failed to get form settings' });
    }
  }

  /**
   * Update form settings
   */
  async updateFormSettings(req, res) {
    try {
      const { formId } = req.params;
      const settings = req.body;

      const updatedSettings = await formService.updateFormSettings(formId, settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating form settings:', error);
      res.status(500).json({ error: 'Failed to update form settings' });
    }
  }

  /**
   * Get question choices
   */
  async getQuestionChoices(req, res) {
    try {
      const { questionId } = req.params;
      const choices = await formService.getQuestionChoices(questionId);
      res.json(choices);
    } catch (error) {
      console.error('Error getting question choices:', error);
      res.status(500).json({ error: 'Failed to get question choices' });
    }
  }

  /**
   * Create question choice
   */
  async createQuestionChoice(req, res) {
    try {
      const { questionId } = req.params;
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Choice text is required' });
      }

      const choice = await formService.createQuestionChoice(questionId, text);
      res.status(201).json(choice);
    } catch (error) {
      console.error('Error creating question choice:', error);
      res.status(500).json({ error: 'Failed to create question choice' });
    }
  }

  /**
   * Update question choice
   */
  async updateQuestionChoice(req, res) {
    try {
      const { choiceId } = req.params;
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Choice text is required' });
      }

      const choice = await formService.updateQuestionChoice(choiceId, text);
      res.json(choice);
    } catch (error) {
      console.error('Error updating question choice:', error);
      res.status(500).json({ error: 'Failed to update question choice' });
    }
  }

  /**
   * Delete question choice
   */
  async deleteQuestionChoice(req, res) {
    try {
      const { choiceId } = req.params;
      await formService.deleteQuestionChoice(choiceId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting question choice:', error);
      res.status(500).json({ error: 'Failed to delete question choice' });
    }
  }

  /**
   * Reorder question choices
   */
  async reorderQuestionChoices(req, res) {
    try {
      const { questionId } = req.params;
      const { choiceIds } = req.body;

      if (!Array.isArray(choiceIds) || choiceIds.length === 0) {
        return res.status(400).json({ error: 'Choice IDs array is required' });
      }

      await formService.reorderQuestionChoices(questionId, choiceIds);
      res.status(204).send();
    } catch (error) {
      console.error('Error reordering question choices:', error);
      res.status(500).json({ error: 'Failed to reorder question choices' });
    }
  }

  /**
   * Start a form submission
   */
  async startSubmission(req, res) {
    try {
      const { formId } = req.params;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const submission = await formService.startSubmission(formId, email, {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.status(201).json(submission);
    } catch (error) {
      console.error('Error starting submission:', error);
      if (error.message === 'Duplicate submission') {
        res.status(409).json({ error: 'You have already submitted this form' });
      } else {
        res.status(500).json({ error: 'Failed to start submission' });
      }
    }
  }

  /**
   * Complete a form submission
   */
  async completeSubmission(req, res) {
    try {
      const { formId, submissionId } = req.params;
      const { responses, startTime } = req.body;

      if (!Array.isArray(responses)) {
        return res.status(400).json({ error: 'Responses must be an array' });
      }

      const completionTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;

      const submission = await formService.completeSubmission(formId, submissionId, responses, completionTime);
      res.json(submission);
    } catch (error) {
      console.error('Error completing submission:', error);
      res.status(500).json({ error: 'Failed to complete submission' });
    }
  }

  /**
   * List form submissions
   */
  async listSubmissions(req, res) {
    try {
      const { formId } = req.params;
      const { page, limit, sort_by, sort_order } = req.query;

      const result = await formService.listSubmissions(formId, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order
      });

      res.json(result);
    } catch (error) {
      console.error('Error listing submissions:', error);
      res.status(500).json({ error: 'Failed to list submissions' });
    }
  }

  /**
   * Get submission details
   */
  async getSubmission(req, res) {
    try {
      const { submissionId } = req.params;
      const submission = await formService.getSubmission(submissionId);

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      res.json(submission);
    } catch (error) {
      console.error('Error getting submission:', error);
      res.status(500).json({ error: 'Failed to get submission' });
    }
  }

  /**
   * Get form analytics
   */
  async getFormAnalytics(req, res) {
    try {
      const { formId } = req.params;
      const { start_date, end_date } = req.query;

      const analytics = await formService.getFormAnalytics(formId, {
        startDate: start_date,
        endDate: end_date
      });

      res.json(analytics);
    } catch (error) {
      console.error('Error getting form analytics:', error);
      res.status(500).json({ error: 'Failed to get form analytics' });
    }
  }

  /**
   * Get question analytics
   */
  async getQuestionAnalytics(req, res) {
    try {
      const { questionId } = req.params;
      const { start_date, end_date } = req.query;

      const analytics = await formService.getQuestionAnalytics(questionId, {
        startDate: start_date,
        endDate: end_date
      });

      res.json(analytics);
    } catch (error) {
      console.error('Error getting question analytics:', error);
      res.status(500).json({ error: 'Failed to get question analytics' });
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(req, res) {
    try {
      const { formId } = req.params;
      const { format = 'csv' } = req.query;

      const data = await formService.exportAnalytics(formId, format);

      // Set appropriate headers
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=analytics.${format}`);

      res.send(data);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ error: 'Failed to export analytics' });
    }
  }

  /**
   * Get form by workspace and form slugs
   */
  async getFormBySlug(req, res) {
    try {
      const { workspaceSlug, formSlug } = req.params;
      const form = await formService.getFormBySlug(workspaceSlug, formSlug);
      res.json(form);
    } catch (error) {
      console.error('Error getting form by slug:', error);
      res.status(error.status || 500).json({
        error: {
          message: error.message || 'Failed to get form',
          code: error.code || 'FORM_FETCH_ERROR'
        }
      });
    }
  }
}

module.exports = new FormController(); 