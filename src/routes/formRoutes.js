const express = require('express');
const router = express.Router({ mergeParams: true });
const formController = require('../controllers/formController');
const { authenticateUser } = require('../middleware/auth');

// Form routes
router.get('/', authenticateUser, formController.listForms);
router.post('/', authenticateUser, formController.createForm);
router.get('/:formId', authenticateUser, formController.getForm);
router.put('/:formId', authenticateUser, formController.updateForm);
router.delete('/:formId', authenticateUser, formController.deleteForm);

// Question routes
router.post('/:formId/questions', authenticateUser, formController.createQuestion);
router.put('/:formId/questions/:questionId', authenticateUser, formController.updateQuestion);
router.delete('/:formId/questions/:questionId', authenticateUser, formController.deleteQuestion);
router.post('/:formId/questions/reorder', authenticateUser, formController.reorderQuestions);

// Question choices routes
router.get('/:formId/questions/:questionId/choices', authenticateUser, formController.getQuestionChoices);
router.post('/:formId/questions/:questionId/choices', authenticateUser, formController.createQuestionChoice);
router.put('/:formId/questions/:questionId/choices/:choiceId', authenticateUser, formController.updateQuestionChoice);
router.delete('/:formId/questions/:questionId/choices/:choiceId', authenticateUser, formController.deleteQuestionChoice);
router.post('/:formId/questions/:questionId/choices/reorder', authenticateUser, formController.reorderQuestionChoices);

// Form settings routes
router.get('/:formId/settings', authenticateUser, formController.getFormSettings);
router.put('/:formId/settings', authenticateUser, formController.updateFormSettings);

module.exports = router; 