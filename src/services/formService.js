const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class FormService {
  constructor() {
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
   * List forms in a workspace
   */
  async listForms(workspaceId, options = {}) {
    try {
      let query = this.supabase
        .from('forms')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      // Add pagination
      const page = options.page || 1;
      const limit = options.limit || 10;
      const start = (page - 1) * limit;
      query = query.range(start, start + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        forms: data,
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
   * Create a new form
   */
  async createForm(workspaceId, { name, description, is_private }) {
    try {
      // Create form
      const { data: form, error: formError } = await this.supabase
        .from('forms')
        .insert([
          { workspace_id: workspaceId, name, description, is_private }
        ])
        .select()
        .single();

      if (formError) throw formError;

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

      if (settingsError) throw settingsError;

      return { ...form, settings };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed form information
   */
  async getForm(formId) {
    try {
      // Get form with questions and settings
      const { data: form, error: formError } = await this.supabase
        .from('forms')
        .select(`
          *,
          questions:questions (
            *,
            choices:question_choices (*)
          ),
          settings:form_settings (*)
        `)
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      // Sort questions and choices by order
      if (form.questions) {
        form.questions.sort((a, b) => a.order - b.order);
        form.questions.forEach(question => {
          if (question.choices) {
            question.choices.sort((a, b) => a.order - b.order);
          }
        });
      }

      return form;
    } catch (error) {
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
   * Reorder questions
   */
  async reorderQuestions(formId, questionIds) {
    try {
      const updates = questionIds.map((id, index) => ({
        id,
        order: index + 1
      }));

      const { error } = await this.supabase
        .from('questions')
        .upsert(updates);

      if (error) throw error;
      return true;
    } catch (error) {
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
}

module.exports = new FormService(); 