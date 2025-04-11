const { Parser } = require('json2csv');
const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('../config/supabase');
require('dotenv').config();

class FormService {
  constructor() {
    this.supabase = supabase;
    
    // Create admin client with service role key for bypassing RLS
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.adminClient = createClient(
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
  }

  /**
   * Convert a string to a URL-safe slug
   * @private
   */
  _createSlug(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/[\s_-]+/g, '-') // Replace spaces and _ with -
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing -
  }

  /**
   * Get shareable link for a form
   * @private
   */
  _getShareableLink(workspaceName, formName) {
    const workspaceSlug = this._createSlug(workspaceName);
    const formSlug = this._createSlug(formName);
    return `${process.env.APP_URL || 'https://tagform.xyz'}/${workspaceSlug}/${formSlug}`;
  }

  /**
   * List forms in a workspace
   */
  async listForms(workspaceId, options = {}) {
    if (!workspaceId) {
      throw new Error('workspaceId is required');
    }

    const page = options.page || 1;
    const limit = options.limit || 10;
    const start = (page - 1) * limit;

    try {
      console.log(`Fetching forms for workspace ${workspaceId}`);
      
      // Use admin client to bypass RLS if available
      const client = this.adminClient || this.supabase;
      
      // Get workspace name first
      const { data: workspace, error: workspaceError } = await client
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) {
        console.error('Error fetching workspace:', workspaceError);
        throw new Error(`Failed to fetch workspace: ${workspaceError.message}`);
      }

      // Get forms
      const { data, error, count } = await client
        .from('forms')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);

      if (error) {
        console.error('Error fetching forms:', error);
        throw new Error(`Failed to fetch forms: ${error.message}`);
      }

      // Add shareable link to each form
      const formsWithLinks = data.map(form => ({
        ...form,
        shareable_link: this._getShareableLink(workspace.name, form.name)
      }));

      console.log(`Found ${count || 0} forms`);

      return {
        forms: formsWithLinks || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Error in listForms:', error);
      throw error;
    }
  }

  /**
   * Validate if a slug is unique within a workspace
   * @private
   */
  async _validateUniqueSlug(workspaceId, slug) {
    const { data, error } = await this.supabase
      .from('forms')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    return !data; // Returns true if slug is unique
  }

  /**
   * Create a new form
   */
  async createForm(workspaceId, { name, description, is_private }) {
    try {
      // Generate initial slug
      let slug = this._createSlug(name);
      let isUnique = await this._validateUniqueSlug(workspaceId, slug);
      
      // If slug exists, append a number until we find a unique one
      let counter = 1;
      while (!isUnique) {
        slug = `${this._createSlug(name)}-${counter}`;
        isUnique = await this._validateUniqueSlug(workspaceId, slug);
        counter++;
      }

      // Create form with the unique slug
      const { data: form, error: formError } = await this.supabase
        .from('forms')
        .insert([{
          workspace_id: workspaceId,
          name,
          description,
          is_private,
          slug
        }])
        .select()
        .single();

      if (formError) {
        console.error('[FormService] Error creating form:', formError);
        throw formError;
      }

      // Create default form settings
      const { data: settings, error: settingsError } = await this.supabase
        .from('form_settings')
        .insert([{
          form_id: form.id,
          landing_page_title: name,
          landing_page_description: description || '',
          landing_page_button_text: 'Start',
          show_progress_bar: true,
          ending_page_title: 'Thank You!',
          ending_page_description: 'Your response has been recorded.',
          ending_page_button_text: 'Submit Another Response'
        }])
        .select()
        .single();

      if (settingsError) {
        console.error('[FormService] Error creating form settings:', settingsError);
        throw settingsError;
      }

      console.log('[FormService] Successfully created form:', {
        formId: form.id,
        name: form.name,
        slug: form.slug
      });

      return { ...form, settings };
    } catch (error) {
      console.error('[FormService] Error in createForm:', error);
      throw error;
    }
  }

  /**
   * Get detailed form information
   */
  async getForm(formId) {
    if (!formId) {
      throw new Error('formId is required');
    }

    try {
      console.log(`Fetching form details for form ${formId}`);
      
      // Use admin client to bypass RLS if available
      const client = this.adminClient || this.supabase;

      // Get form with questions, settings, and workspace info
      const { data: form, error: formError } = await client
        .from('forms')
        .select(`
          *,
          questions (
            *,
            choices:question_choices (*)
          ),
          settings:form_settings (*),
          workspaces!inner (
            name
          )
        `)
        .eq('id', formId)
        .single();

      if (formError) {
        console.error('Error fetching form:', formError);
        throw new Error(`Failed to fetch form: ${formError.message}`);
      }

      if (!form) {
        throw new Error(`Form with id ${formId} not found`);
      }

      // Add shareable link
      form.shareable_link = this._getShareableLink(form.workspaces.name, form.name);
      delete form.workspaces; // Remove workspace info from response

      // Sort questions and choices by order
      if (form.questions) {
        form.questions.sort((a, b) => a.order - b.order);
        form.questions.forEach(question => {
          if (question.choices) {
            question.choices.sort((a, b) => a.order - b.order);
          }
        });
      }

      console.log(`Successfully fetched form ${formId}`);
      return form;
    } catch (error) {
      console.error('Error in getForm:', error);
      throw error;
    }
  }

  /**
   * Update form metadata
   */
  async updateForm(formId, { name, description, is_private }) {
    try {
      const { data, error } = await this.supabase
        .from('forms')
        .update({ name, description, is_private })
        .eq('id', formId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete form and all associated data (questions, choices, settings)
   */
  async deleteForm(formId) {
    try {
      // Start a Supabase transaction
      const { data: form, error: formError } = await this.supabase
        .from('forms')
        .select(`
          id,
          questions (
            id,
            question_choices (id)
          ),
          form_settings (id)
        `)
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      // Delete in order to respect foreign key constraints
      // 1. Delete question choices
      if (form.questions) {
        for (const question of form.questions) {
          if (question.question_choices) {
            const { error: choicesError } = await this.supabase
              .from('question_choices')
              .delete()
              .eq('question_id', question.id);
            if (choicesError) throw choicesError;
          }
        }
      }

      // 2. Delete questions
      if (form.questions) {
        const { error: questionsError } = await this.supabase
          .from('questions')
          .delete()
          .eq('form_id', formId);
        if (questionsError) throw questionsError;
      }

      // 3. Delete form settings
      if (form.form_settings) {
        const { error: settingsError } = await this.supabase
          .from('form_settings')
          .delete()
          .eq('form_id', formId);
        if (settingsError) throw settingsError;
      }

      // 4. Finally, delete the form itself
      const { error: deleteError } = await this.supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (deleteError) throw deleteError;

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new question
   */
  async createQuestion(formId, { type, text, description, is_required, max_chars, choices }) {
    try {
      // Get current max order
      const { data: questions } = await this.supabase
        .from('questions')
        .select('order')
        .eq('form_id', formId)
        .order('order', { ascending: false })
        .limit(1);

      const nextOrder = questions?.[0]?.order + 1 || 1;

      // Create question
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .insert([{
          form_id: formId,
          type,
          text,
          description,
          is_required,
          max_chars,
          order: nextOrder
        }])
        .select()
        .single();

      if (questionError) throw questionError;

      // Create choices if provided
      if (choices && choices.length > 0) {
        const choicesData = choices.map((text, index) => ({
          question_id: question.id,
          text,
          order: index + 1
        }));

        const { data: questionChoices, error: choicesError } = await this.supabase
          .from('question_choices')
          .insert(choicesData)
          .select();

        if (choicesError) throw choicesError;
        question.choices = questionChoices;
      }

      return question;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a question
   */
  async updateQuestion(questionId, { text, description, is_required, max_chars, choices }) {
    try {
      // Update question
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .update({ text, description, is_required, max_chars })
        .eq('id', questionId)
        .select()
        .single();

      if (questionError) throw questionError;

      // Update choices if provided
      if (choices) {
        // Delete existing choices
        await this.supabase
          .from('question_choices')
          .delete()
          .eq('question_id', questionId);

        // Insert new choices
        if (choices.length > 0) {
          const choicesData = choices.map((text, index) => ({
            question_id: questionId,
            text,
            order: index + 1
          }));

          const { data: questionChoices, error: choicesError } = await this.supabase
            .from('question_choices')
            .insert(choicesData)
            .select();

          if (choicesError) throw choicesError;
          question.choices = questionChoices;
        }
      }

      return question;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId) {
    try {
      const { error } = await this.supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reorder questions with support for hierarchy
   * @param {string} formId - The form ID
   * @param {Array<{id: string, parentId: string|null, order: number}>} questionOrder - Array of question order updates
   */
  async reorderQuestions(formId, questionOrder) {
    try {
      console.log('Reordering questions:', questionOrder);

      // Group updates by parent_id for ordered processing
      const updatesByParent = questionOrder.reduce((acc, item) => {
        const key = item.parentId || 'root';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      // Process root level questions first
      const rootUpdates = (updatesByParent.root || []).map((item, index) => ({
        id: item.id,
        parent_id: null,
        order: index + 1
      }));

      // Then process child questions
      const childUpdates = Object.entries(updatesByParent)
        .filter(([key]) => key !== 'root')
        .flatMap(([parentId, items]) =>
          items.map((item, index) => ({
            id: item.id,
            parent_id: parentId,
            order: index + 1
          }))
        );

      const updates = [...rootUpdates, ...childUpdates];

      // Perform the updates in a transaction
      const { error } = await this.supabase
        .from('questions')
        .upsert(updates, {
          onConflict: 'id',
          returning: 'minimal'
        });

      if (error) {
        console.error('Error reordering questions:', error);
        throw new Error(`Failed to reorder questions: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in reorderQuestions:', error);
      throw error;
    }
  }

  /**
   * Get questions with their hierarchy
   * @param {string} formId - The form ID
   */
  async getQuestionsHierarchy(formId) {
    try {
      const { data, error } = await this.supabase
        .from('questions')
        .select(`
          *,
          choices:question_choices (
            id,
            text,
            order
          )
        `)
        .eq('form_id', formId)
        .order('path', { ascending: true });

      if (error) {
        console.error('Error fetching questions hierarchy:', error);
        throw new Error(`Failed to fetch questions hierarchy: ${error.message}`);
      }

      // Build the hierarchy
      const questionMap = new Map();
      const rootQuestions = [];

      // First pass: Create all question nodes
      data.forEach(question => {
        question.children = [];
        if (question.choices) {
          question.choices.sort((a, b) => a.order - b.order);
        }
        questionMap.set(question.id, question);
      });

      // Second pass: Build the tree structure
      data.forEach(question => {
        if (question.parent_id) {
          const parent = questionMap.get(question.parent_id);
          if (parent) {
            parent.children.push(question);
          }
        } else {
          rootQuestions.push(question);
        }
      });

      // Sort children by order
      const sortChildren = (questions) => {
        questions.sort((a, b) => a.order - b.order);
        questions.forEach(q => {
          if (q.children.length > 0) {
            sortChildren(q.children);
          }
        });
      };
      sortChildren(rootQuestions);

      return rootQuestions;
    } catch (error) {
      console.error('Error in getQuestionsHierarchy:', error);
      throw error;
    }
  }

  /**
   * Move a question to be a child of another question
   * @param {string} questionId - The question to move
   * @param {string|null} newParentId - The new parent question ID (null for root level)
   */
  async moveQuestion(questionId, newParentId) {
    try {
      // Verify the questions exist and are in the same form
      if (newParentId) {
        const { data: questions, error: fetchError } = await this.supabase
          .from('questions')
          .select('form_id')
          .in('id', [questionId, newParentId]);

        if (fetchError) throw fetchError;

        if (questions.length !== 2 || questions[0].form_id !== questions[1].form_id) {
          throw new Error('Invalid question IDs or questions not in same form');
        }
      }

      // Update the question's parent
      const { error: updateError } = await this.supabase
        .from('questions')
        .update({ parent_id: newParentId })
        .eq('id', questionId);

      if (updateError) {
        console.error('Error moving question:', updateError);
        throw new Error(`Failed to move question: ${updateError.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in moveQuestion:', error);
      throw error;
    }
  }

  /**
   * Get form settings
   */
  async getFormSettings(formId) {
    try {
      const { data, error } = await this.supabase
        .from('form_settings')
        .select('*')
        .eq('form_id', formId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update form settings
   */
  async updateFormSettings(formId, settings) {
    try {
      const { data, error } = await this.supabase
        .from('form_settings')
        .update(settings)
        .eq('form_id', formId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get question choices
   */
  async getQuestionChoices(questionId) {
    try {
      const { data, error } = await this.supabase
        .from('question_choices')
        .select('*')
        .eq('question_id', questionId)
        .order('order', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create question choice
   */
  async createQuestionChoice(questionId, text) {
    try {
      // Get current max order
      const { data: choices } = await this.supabase
        .from('question_choices')
        .select('order')
        .eq('question_id', questionId)
        .order('order', { ascending: false })
        .limit(1);

      const nextOrder = choices?.[0]?.order + 1 || 1;

      const { data, error } = await this.supabase
        .from('question_choices')
        .insert([{
          question_id: questionId,
          text,
          order: nextOrder
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update question choice
   */
  async updateQuestionChoice(choiceId, text) {
    try {
      const { data, error } = await this.supabase
        .from('question_choices')
        .update({ text })
        .eq('id', choiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete question choice
   */
  async deleteQuestionChoice(choiceId) {
    try {
      const { error } = await this.supabase
        .from('question_choices')
        .delete()
        .eq('id', choiceId);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reorder question choices
   */
  async reorderQuestionChoices(questionId, choiceIds) {
    try {
      const updates = choiceIds.map((id, index) => ({
        id,
        order: index + 1
      }));

      const { error } = await this.supabase
        .from('question_choices')
        .upsert(updates);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start a form submission
   */
  async startSubmission(formId, email, req) {
    try {
      console.log(`[FormService] Starting submission for form ${formId} with email ${email}`);
      
      // Use admin client for public operations
      const client = this.adminClient || this.supabase;

      // First check if a submission exists
      const { data: existingSubmission, error: checkError } = await client
        .from('form_submissions')
        .select('*')
        .eq('form_id', formId)
        .eq('email', email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('[FormService] Error checking existing submission:', checkError);
        throw new Error('Failed to check existing submission');
      }

      // If submission exists
      if (existingSubmission) {
        // If completed, return error with more details
        if (existingSubmission.status === 'completed') {
          console.log('[FormService] Found completed submission:', {
            submissionId: existingSubmission.id,
            formId: existingSubmission.form_id,
            email: existingSubmission.email,
            completedAt: existingSubmission.completed_at
          });
          return {
            error: true,
            message: `This form has already been completed by ${email} on ${new Date(existingSubmission.completed_at).toLocaleString()}`,
            submission: {
              id: existingSubmission.id,
              completedAt: existingSubmission.completed_at,
              email: existingSubmission.email
            }
          };
        }
        // If in progress, return it to continue
        console.log('[FormService] Found in-progress submission:', {
          submissionId: existingSubmission.id,
          formId: existingSubmission.form_id,
          email: existingSubmission.email,
          startedAt: existingSubmission.started_at,
          status: existingSubmission.status
        });
        return existingSubmission;
      }

      // Create new submission
      const now = new Date().toISOString();
      const { data: submission, error: submissionError } = await client
        .from('form_submissions')
        .insert({
          form_id: formId,
          email,
          status: 'in_progress',
          started_at: now,
          metadata: {
            user_agent: req?.headers?.['user-agent'],
            ip_address: req?.ip
          }
        })
        .select()
        .single();

      if (submissionError) {
        console.error('[FormService] Error creating submission:', submissionError);
        throw new Error('Failed to create submission');
      }

      console.log('[FormService] Successfully created new submission:', {
        submissionId: submission.id,
        formId: submission.form_id,
        email: submission.email,
        startedAt: submission.started_at,
        status: submission.status
      });

      return submission;
    } catch (error) {
      console.error('[FormService] Error in startSubmission:', error);
      throw error;
    }
  }

  /**
   * Complete a form submission
   */
  async completeSubmission(formId, submissionId, responses, completionTime) {
    const { error: submissionError } = await this.supabase
      .from('form_submissions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_time: completionTime
      })
      .eq('id', submissionId)
      .eq('form_id', formId);

    if (submissionError) throw new Error(`Failed to update submission: ${submissionError.message}`);

    // Insert responses
    const formattedResponses = responses.map(response => ({
      submission_id: submissionId,
      question_id: response.questionId,
      response_data: response.data
    }));

    const { error: responsesError } = await this.supabase
      .from('question_responses')
      .insert(formattedResponses);

    if (responsesError) throw new Error(`Failed to save responses: ${responsesError.message}`);

    // Update analytics
    await this.updateFormAnalytics(formId);

    return { success: true };
  }

  /**
   * List form submissions
   */
  async listSubmissions(formId, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status
    } = options;

    const offset = (page - 1) * limit;
    let query = this.supabase
      .from('form_submissions')
      .select(`
        *,
        question_responses (
          question_id,
          response_data
        )
      `)
      .eq('form_id', formId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: submissions, error, count } = await query;

    if (error) throw new Error(`Failed to fetch submissions: ${error.message}`);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get submission details
   */
  async getSubmission(submissionId) {
    const { data: submission, error } = await this.supabase
      .from('form_submissions')
      .select(`
        *,
        question_responses (
          question_id,
          response_data
        )
      `)
      .eq('id', submissionId)
      .single();

    if (error) throw new Error(`Failed to fetch submission: ${error.message}`);
    return submission;
  }

  /**
   * Get form analytics
   */
  async getFormAnalytics(formId, options = {}) {
    const { startDate, endDate } = options;
    let query = this.supabase
      .from('form_analytics')
      .select('*')
      .eq('form_id', formId);

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: analytics, error } = await query;

    if (error) throw new Error(`Failed to fetch form analytics: ${error.message}`);
    return analytics;
  }

  /**
   * Get question analytics
   */
  async getQuestionAnalytics(questionId, options = {}) {
    const { startDate, endDate } = options;
    let query = this.supabase
      .from('question_analytics')
      .select('*')
      .eq('question_id', questionId);

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: analytics, error } = await query;

    if (error) throw new Error(`Failed to fetch question analytics: ${error.message}`);
    return analytics;
  }

  /**
   * Update form analytics
   */
  async updateFormAnalytics(formId) {
    try {
      console.log(`[FormService] Updating analytics for form ${formId}`);
      
      const client = this.adminClient || this.supabase;

      // Get all completed submissions for this form
      const { data: submissions, error: submissionsError } = await client
        .from('form_submissions')
        .select('completion_time')
        .eq('form_id', formId)
        .eq('status', 'completed');

      if (submissionsError) {
        console.error('[FormService] Error fetching submissions:', submissionsError);
        throw new Error('Failed to fetch submissions');
      }

      // Calculate analytics
      const totalSubmissions = submissions.length;
      const averageCompletionTime = totalSubmissions > 0
        ? Math.round(submissions.reduce((sum, sub) => sum + (sub.completion_time || 0), 0) / totalSubmissions)
        : 0;

      // Update analytics
      const { error: updateError } = await client
        .from('form_analytics')
        .upsert({
          form_id: formId,
          total_submissions: totalSubmissions,
          average_completion_time: averageCompletionTime,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'form_id'
        });

      if (updateError) {
        console.error('[FormService] Error updating analytics:', updateError);
        throw new Error('Failed to update analytics');
      }

      console.log('[FormService] Successfully updated analytics:', {
        formId,
        totalSubmissions,
        averageCompletionTime
      });
    } catch (error) {
      console.error('[FormService] Error in updateFormAnalytics:', error);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(formId, format = 'csv') {
    const { data: submissions, error } = await this.supabase
      .from('form_submissions')
      .select(`
        *,
        question_responses (
          question_id,
          response_data
        )
      `)
      .eq('form_id', formId)
      .eq('status', 'completed');

    if (error) throw new Error(`Failed to fetch data for export: ${error.message}`);

    if (format === 'json') {
      return submissions;
    }

    // Format data for CSV export
    const flattenedData = submissions.map(submission => ({
      submission_id: submission.id,
      email: submission.email,
      started_at: submission.started_at,
      completed_at: submission.completed_at,
      completion_time: submission.completion_time,
      ...submission.question_responses.reduce((acc, response) => ({
        ...acc,
        [`question_${response.question_id}`]: JSON.stringify(response.response_data)
      }), {})
    }));

    const parser = new Parser();
    return parser.parse(flattenedData);
  }

  /**
   * Initialize question hierarchy
   * This should be called once to set up hierarchy support
   */
  async initializeQuestionHierarchy() {
    try {
      console.log('Initializing question hierarchy...');
      
      // Use admin client to bypass RLS
      const client = this.adminClient || this.supabase;

      // Enable ltree extension if not enabled
      await client.rpc('create_ltree_extension');

      // Add parent_id and path columns
      const { error: alterError } = await client
        .rpc('add_question_hierarchy_columns');

      if (alterError) {
        console.error('Error adding hierarchy columns:', alterError);
        throw new Error(`Failed to add hierarchy columns: ${alterError.message}`);
      }

      // Initialize paths for existing questions
      const { error: updateError } = await client
        .rpc('initialize_question_paths');

      if (updateError) {
        console.error('Error initializing paths:', updateError);
        throw new Error(`Failed to initialize paths: ${updateError.message}`);
      }

      console.log('Question hierarchy initialized successfully');
      return true;
    } catch (error) {
      console.error('Error in initializeQuestionHierarchy:', error);
      throw error;
    }
  }

  /**
   * Get form by workspace and form slugs
   * @param {string} workspaceSlug - The workspace slug
   * @param {string} formSlug - The form slug
   */
  async getFormBySlug(workspaceSlug, formSlug) {
    try {
      console.log(`Fetching form with slug ${formSlug} in workspace ${workspaceSlug}`);
      
      // Use admin client to bypass RLS if available
      const client = this.adminClient || this.supabase;

      // First get the workspace
      const { data: workspace, error: workspaceError } = await client
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceSlug)
        .single();

      if (workspaceError || !workspace) {
        throw new Error('Workspace not found');
      }

      // Then get the form with its questions and settings
      const { data: form, error: formError } = await client
        .from('forms')
        .select(`
          *,
          questions (
            *,
            choices:question_choices (
              id,
              text,
              order
            )
          ),
          settings:form_settings (*)
        `)
        .eq('workspace_id', workspace.id)
        .eq('slug', formSlug)
        .single();

      if (formError) {
        console.error('Error fetching form:', formError);
        throw new Error(`Failed to fetch form: ${formError.message}`);
      }

      if (!form) {
        throw new Error('Form not found');
      }

      // Sort questions and choices by order
      if (form.questions) {
        form.questions.sort((a, b) => a.order - b.order);
        form.questions.forEach(question => {
          if (question.choices) {
            question.choices.sort((a, b) => a.order - b.order);
          }
        });
      }

      console.log(`Successfully fetched form ${formSlug}`);
      return form;
    } catch (error) {
      console.error('Error in getFormBySlug:', error);
      throw error;
    }
  }

  /**
   * Get form by URL path
   * @param {string} path - The URL path after the domain (e.g., "my-workspace/my-form")
   */
  async getFormByPath(path) {
    try {
      console.log(`[FormService] Fetching form by path: ${path}`);
      
      // Split path into workspace and form parts
      const [workspaceSlug, formSlug] = path.split('/');
      
      if (!workspaceSlug || !formSlug) {
        console.error('[FormService] Invalid path format:', { path });
        throw new Error('Invalid form path format');
      }

      // Use admin client to bypass RLS if available
      const client = this.adminClient || this.supabase;

      // First get the workspace by name (convert slug back to name format)
      const workspaceName = workspaceSlug.replace(/-/g, ' ');
      console.log('[FormService] Fetching workspace with name:', workspaceName);
      
      const { data: workspaces, error: workspaceError } = await client
        .from('workspaces')
        .select('id, name')
        .ilike('name', workspaceName);

      if (workspaceError) {
        console.error('[FormService] Error fetching workspace:', workspaceError);
        throw new Error('Failed to fetch workspace');
      }

      console.log('[FormService] Found workspaces:', workspaces);

      if (!workspaces || workspaces.length === 0) {
        console.error('[FormService] Workspace not found:', { workspaceName });
        throw new Error('Workspace not found');
      }

      const workspaceId = workspaces[0].id;
      const workspaceNameFound = workspaces[0].name;

      console.log('[FormService] Using workspace:', {
        id: workspaceId,
        name: workspaceNameFound
      });

      // Then get the form with its questions and settings
      console.log('[FormService] Fetching form:', { workspaceId, formSlug });
      const { data: forms, error: formError } = await client
        .from('forms')
        .select(`
          *,
          questions (
            *,
            choices:question_choices (
              id,
              text,
              order
            )
          ),
          settings:form_settings (*)
        `)
        .eq('workspace_id', workspaceId)
        .ilike('name', formSlug.replace(/-/g, ' '));

      if (formError) {
        console.error('[FormService] Error fetching form:', formError);
        throw new Error('Failed to fetch form');
      }

      console.log('[FormService] Found forms:', forms);

      if (!forms || forms.length === 0) {
        console.error('[FormService] Form not found:', { workspaceId, formSlug });
        throw new Error('Form not found');
      }

      const form = forms[0];

      // Sort questions and choices by order
      if (form.questions) {
        form.questions.sort((a, b) => a.order - b.order);
        form.questions.forEach(question => {
          if (question.choices) {
            question.choices.sort((a, b) => a.order - b.order);
          }
        });
      }

      // Add shareable link using the workspace name and form name
      form.shareable_link = `${process.env.APP_URL || 'https://tagform.xyz'}/${this._createSlug(workspaceNameFound)}/${this._createSlug(form.name)}`;

      console.log(`[FormService] Successfully fetched form:`, {
        formId: form.id,
        workspaceName: workspaceNameFound,
        formName: form.name,
        questionCount: form.questions?.length || 0
      });

      return form;
    } catch (error) {
      console.error('[FormService] Error in getFormByPath:', error);
      throw error;
    }
  }

  /**
   * Regenerate slugs for all forms in a workspace
   */
  async regenerateSlugs(workspaceId) {
    try {
      // Get all forms in the workspace
      const { data: forms, error: fetchError } = await this.supabase
        .from('forms')
        .select('id, name')
        .eq('workspace_id', workspaceId);

      if (fetchError) {
        console.error('[FormService] Error fetching forms:', fetchError);
        throw fetchError;
      }

      // Process each form
      const results = [];
      for (const form of forms) {
        // Generate initial slug
        let slug = this._createSlug(form.name);
        let isUnique = await this._validateUniqueSlug(workspaceId, slug);
        
        // If slug exists, append a number until we find a unique one
        let counter = 1;
        while (!isUnique) {
          slug = `${this._createSlug(form.name)}-${counter}`;
          isUnique = await this._validateUniqueSlug(workspaceId, slug);
          counter++;
        }

        // Update the form with the new slug
        const { data: updatedForm, error: updateError } = await this.supabase
          .from('forms')
          .update({ slug })
          .eq('id', form.id)
          .select()
          .single();

        if (updateError) {
          console.error(`[FormService] Error updating form ${form.id}:`, updateError);
          results.push({ formId: form.id, success: false, error: updateError });
        } else {
          console.log(`[FormService] Successfully updated form ${form.id} with slug:`, slug);
          results.push({ formId: form.id, success: true, slug });
        }
      }

      return results;
    } catch (error) {
      console.error('[FormService] Error in regenerateSlugs:', error);
      throw error;
    }
  }

  async listSubmissionsWithDetails(formId, { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    try {
      console.log(`[FormService] Fetching submissions with details for form ${formId}`);
      
      const client = this.adminClient || this.supabase;

      // First get the form with its questions
      const { data: form, error: formError } = await client
        .from('forms')
        .select(`
          id,
          name,
          questions (
            id,
            text,
            type,
            description,
            is_required,
            order,
            choices:question_choices (
              id,
              text,
              order
            )
          )
        `)
        .eq('id', formId)
        .single();

      if (formError) {
        console.error('[FormService] Error fetching form:', formError);
        throw new Error('Failed to fetch form');
      }

      // Get submissions with responses
      const { data: submissions, error: submissionsError, count } = await client
        .from('form_submissions')
        .select(`
          *,
          question_responses (
            question_id,
            answer,
            choices,
            response_data
          )
        `, { count: 'exact' })
        .eq('form_id', formId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      if (submissionsError) {
        console.error('[FormService] Error fetching submissions:', submissionsError);
        throw new Error('Failed to fetch submissions');
      }

      // Create a map of question IDs to questions for easy lookup
      const questionMap = new Map(form.questions.map(q => [q.id, q]));

      // Enhance submissions with question details
      const enhancedSubmissions = submissions.map(submission => ({
        ...submission,
        question_responses: submission.question_responses.map(response => ({
          ...response,
          question: questionMap.get(response.question_id)
        })).sort((a, b) => (a.question?.order || 0) - (b.question?.order || 0))
      }));

      console.log(`[FormService] Found ${enhancedSubmissions.length} submissions`);

      return {
        submissions: enhancedSubmissions,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        },
        form: {
          id: form.id,
          name: form.name,
          questions: form.questions.sort((a, b) => a.order - b.order)
        }
      };
    } catch (error) {
      console.error('[FormService] Error in listSubmissionsWithDetails:', error);
      throw error;
    }
  }
}

module.exports = new FormService(); 