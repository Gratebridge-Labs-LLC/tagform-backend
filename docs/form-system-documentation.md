# Form System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Form Structure](#form-structure)
3. [Question Types](#question-types)
4. [API Endpoints](#api-endpoints)
5. [Submission Flow](#submission-flow)
6. [Response Formats](#response-formats)
7. [Validation Rules](#validation-rules)
8. [Error Handling](#error-handling)
9. [Implementation Guide](#implementation-guide)

## Overview

The form system allows users to:
- Create and manage forms
- Organize questions in a hierarchical structure
- Collect responses with various question types
- Track analytics and submission data
- Export form responses

## Form Structure

### Form Object
```javascript
{
  "id": "uuid",
  "name": "Form Name",
  "description": "Form Description",
  "workspace_id": "uuid",
  "is_private": boolean,
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "questions": [...],
  "settings": {...}
}
```

### Form Settings
```javascript
{
  "landing_page_title": "Welcome",
  "landing_page_description": "Please fill out this form",
  "landing_page_button_text": "Start",
  "show_progress_bar": boolean,
  "ending_page_title": "Thank You",
  "ending_page_description": "Your response has been recorded",
  "ending_page_button_text": "Submit Another Response",
  "redirect_url": "https://example.com" // Optional
}
```

### Question Structure
```javascript
{
  "id": "uuid",
  "form_id": "uuid",
  "type": "question_type",
  "text": "Question text",
  "description": "Optional description",
  "is_required": boolean,
  "max_chars": number|null,
  "order": number,
  "parent_id": "uuid"|null,
  "choices": [...],  // For multiple-choice, dropdown, checkbox
  "children": [...]  // Nested questions
}
```

## Question Types

1. **Text-based Questions**
   - short-text
   - long-text
   - email
   - phone
   - address
   - website

2. **Choice Questions**
   - multiple-choice (single selection)
   - dropdown (single selection)
   - checkbox (multiple selection)
   - yes-no (boolean)

3. **Date Questions**
   - date (YYYY-MM-DD format)

## API Endpoints

### Form Management

#### Get Form List
```javascript
GET /api/workspaces/:workspaceId/forms

Response:
{
  "forms": [{
    "id": "uuid",
    "name": "Form Name",
    "description": "Description",
    "created_at": "timestamp"
  }],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### Get Form Details
```javascript
GET /api/forms/:formId

Response: {
  // Complete form object with questions and settings
}
```

### Submission Flow

#### 1. Start Submission
```javascript
POST /api/forms/:formId/submissions/start
Body: {
  "email": "user@example.com",
  "metadata": {
    "browser": "Chrome",
    "device": "Desktop",
    "location": "US"
  }
}

Response: {
  "id": "uuid",
  "form_id": "uuid",
  "email": "user@example.com",
  "status": "in_progress",
  "started_at": "timestamp",
  "metadata": {...}
}
```

#### 2. Complete Submission
```javascript
POST /api/forms/:formId/submissions/:submissionId/complete
Body: {
  "responses": [
    {
      "questionId": "uuid",
      "data": {
        // Response data based on question type
      }
    }
  ],
  "completionTime": 300  // seconds
}

Response: {
  "success": true
}
```

## Response Formats

### Text Questions
```javascript
{
  "questionId": "uuid",
  "data": {
    "text": "User's response"
  }
}
```

### Multiple-choice/Dropdown
```javascript
{
  "questionId": "uuid",
  "data": {
    "choiceId": "uuid"
  }
}
```

### Checkbox
```javascript
{
  "questionId": "uuid",
  "data": {
    "choiceIds": ["uuid1", "uuid2"]
  }
}
```

### Yes/No
```javascript
{
  "questionId": "uuid",
  "data": {
    "value": boolean
  }
}
```

### Date
```javascript
{
  "questionId": "uuid",
  "data": {
    "date": "2024-03-20"
  }
}
```

## Validation Rules

1. **Email**
   - Must be valid email format
   - Required for starting submission

2. **Required Questions**
   - Must have response if is_required is true
   - Empty responses not allowed for required questions

3. **Text Length**
   - Must not exceed max_chars if specified
   - No limit if max_chars is null

4. **Choices**
   - Selected choiceId must exist in question choices
   - Multiple selections only allowed for checkbox type

5. **Date**
   - Must be valid ISO format (YYYY-MM-DD)
   - Cannot be empty if required

## Error Handling

### Error Response Format
```javascript
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {
      "questionId": "Specific error for this question"
    }
  }
}
```

### Common Error Codes
- `INVALID_EMAIL`: Email format invalid
- `REQUIRED_FIELD`: Required question not answered
- `INVALID_CHOICE`: Selected choice doesn't exist
- `TEXT_TOO_LONG`: Response exceeds max_chars
- `INVALID_DATE`: Date format incorrect
- `DUPLICATE_SUBMISSION`: Email already submitted
- `SUBMISSION_NOT_FOUND`: Invalid submission ID
- `FORM_NOT_FOUND`: Invalid form ID

## Implementation Guide

### Frontend Flow

1. **Landing Page**
   - Display form.settings.landing_page_title
   - Show form.settings.landing_page_description
   - Use form.settings.landing_page_button_text for start button

2. **Start Submission**
   - Collect user email
   - Call start submission endpoint
   - Store submissionId for later use

3. **Question Display**
   - Show questions in order (form.questions sorted by order)
   - Handle nested questions (check parent_id and children)
   - Show progress bar if form.settings.show_progress_bar is true

4. **Question Rendering**
   - Use question.type to determine input type
   - Show question.text and question.description
   - Mark required questions (question.is_required)
   - For choice questions, display choices in order

5. **Response Collection**
   - Validate responses as user inputs
   - Store responses temporarily
   - Track completion time

6. **Submission**
   - Collect all responses
   - Call complete submission endpoint
   - Show ending page or redirect

7. **Completion**
   - Display form.settings.ending_page_title
   - Show form.settings.ending_page_description
   - Use form.settings.ending_page_button_text
   - Redirect to form.settings.redirect_url if specified

### Best Practices

1. **Performance**
   - Cache form structure after initial load
   - Validate responses in real-time
   - Show loading states during API calls

2. **User Experience**
   - Save responses locally to prevent loss
   - Show clear validation messages
   - Allow navigation between questions
   - Support keyboard navigation

3. **Accessibility**
   - Use proper ARIA labels
   - Ensure keyboard navigation
   - Maintain proper contrast
   - Support screen readers

4. **Error Handling**
   - Show user-friendly error messages
   - Provide clear validation feedback
   - Allow error correction
   - Preserve entered data

5. **Mobile Support**
   - Responsive design
   - Touch-friendly inputs
   - Appropriate keyboard types
   - Readable font sizes 