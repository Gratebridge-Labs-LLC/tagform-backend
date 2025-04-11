# Form Submission Guide

## Submission Flow

### 1. Get Form Details
```javascript
GET /api/forms/:formId

Response:
{
  "id": "uuid",
  "name": "Form Name",
  "description": "Form Description",
  "questions": [
    {
      "id": "uuid",
      "type": "multiple-choice|dropdown|yes-no|checkbox|short-text|long-text|email|phone|address|website|date",
      "text": "Question text",
      "description": "Optional description",
      "is_required": boolean,
      "max_chars": number|null,
      "order": number,
      "choices": [  // Only for multiple-choice, dropdown, checkbox
        {
          "id": "uuid",
          "text": "Choice text",
          "order": number
        }
      ]
    }
  ],
  "settings": {
    "landing_page_title": "Welcome",
    "landing_page_description": "Form description",
    "landing_page_button_text": "Start",
    "show_progress_bar": boolean
  }
}
```

### 2. Start Submission Session
```javascript
POST /api/forms/:formId/submissions/start
Body: {
  "email": "user@example.com"
}

Response: {
  "id": "uuid",         // This is your submissionId for the next step
  "form_id": "uuid",
  "email": "user@example.com",
  "status": "in_progress",
  "started_at": "2024-03-20T10:00:00Z"
}
```

### 3. Submit Responses
```javascript
POST /api/forms/:formId/submissions/:submissionId/complete
Body: {
  "responses": [
    {
      "questionId": "uuid",
      "data": {
        // Response data based on question type (see below)
      }
    }
  ],
  "completionTime": 300  // Time taken in seconds
}

Response: {
  "success": true
}
```

## Response Formats by Question Type

### Text Questions (short-text, long-text, email, phone, address, website)
```javascript
{
  "questionId": "uuid",
  "data": {
    "text": "User's text response"
  }
}
```

### Multiple-choice or Dropdown (Single Selection)
```javascript
{
  "questionId": "uuid",
  "data": {
    "choiceId": "uuid"  // ID of the selected choice
  }
}
```

### Checkbox (Multiple Selection)
```javascript
{
  "questionId": "uuid",
  "data": {
    "choiceIds": ["uuid1", "uuid2"]  // Array of selected choice IDs
  }
}
```

### Yes/No Questions
```javascript
{
  "questionId": "uuid",
  "data": {
    "value": true  // or false
  }
}
```

### Date Questions
```javascript
{
  "questionId": "uuid",
  "data": {
    "date": "2024-03-20"  // YYYY-MM-DD format
  }
}
```

## Example Submission

```javascript
// 1. Get form details
const form = await fetch('/api/forms/form-123').then(r => r.json());

// 2. Start submission
const submission = await fetch('/api/forms/form-123/submissions/start', {
  method: 'POST',
  body: JSON.stringify({
    email: "user@example.com"
  })
}).then(r => r.json());

// 3. Submit responses
const responses = [
  {
    questionId: "q1",
    data: { text: "John Doe" }  // For a short-text question
  },
  {
    questionId: "q2",
    data: { choiceId: "choice1" }  // For a multiple-choice question
  },
  {
    questionId: "q3",
    data: { choiceIds: ["choice1", "choice2"] }  // For a checkbox question
  },
  {
    questionId: "q4",
    data: { value: true }  // For a yes/no question
  },
  {
    questionId: "q5",
    data: { date: "2024-03-20" }  // For a date question
  }
];

await fetch(`/api/forms/form-123/submissions/${submission.id}/complete`, {
  method: 'POST',
  body: JSON.stringify({
    responses: responses,
    completionTime: 300
  })
});
```

## Validation Rules

1. **Required Questions**
   - Check `question.is_required`
   - Must provide a response if true

2. **Text Length**
   - Check `question.max_chars`
   - Text response must not exceed this limit

3. **Choice Validation**
   - Choice IDs must exist in `question.choices`
   - Single choice for multiple-choice/dropdown
   - Multiple choices allowed only for checkbox

4. **Date Format**
   - Must be YYYY-MM-DD
   - Must be valid date

## Error Handling

The API will return errors in this format:
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

Common errors:
- `REQUIRED_FIELD`: Required question not answered
- `INVALID_CHOICE`: Selected choice doesn't exist
- `TEXT_TOO_LONG`: Response exceeds max_chars
- `INVALID_DATE`: Date format incorrect 