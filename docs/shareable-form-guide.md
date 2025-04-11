# Shareable Form Links Guide

## URL Structure
Forms can now be accessed using friendly URLs in this format:
```
https://tagform.xyz/{workspace-slug}/{form-slug}
```

Example:
```
https://tagform.xyz/acme-corp/customer-feedback
```

## Form Submission Flow

### 1. Access Form via URL
```javascript
// Example: Getting form from URL
const pathParts = window.location.pathname.split('/');
const workspaceSlug = pathParts[1];
const formSlug = pathParts[2];

// Fetch form details
const form = await fetch(`/api/forms/${workspaceSlug}/${formSlug}`).then(r => r.json());
```

### 2. Start Submission
```javascript
const submission = await fetch(`/api/forms/${form.id}/submissions/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: userEmail
  })
}).then(r => r.json());
```

### 3. Submit Responses
```javascript
await fetch(`/api/forms/${form.id}/submissions/${submission.id}/complete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    responses: [
      {
        questionId: "q1",
        data: { text: "Response text" }
      },
      // ... more responses
    ],
    completionTime: 300 // seconds
  })
});
```

## Response Data Structure

### Form Response
```javascript
{
  "id": "uuid",
  "name": "Form Name",
  "description": "Form Description",
  "workspace_id": "uuid",
  "slug": "form-slug",
  "questions": [
    {
      "id": "uuid",
      "type": "question_type",
      "text": "Question text",
      "description": "Optional description",
      "is_required": boolean,
      "order": number,
      "choices": [
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
    "show_progress_bar": boolean,
    "ending_page_title": "Thank You",
    "ending_page_description": "Response recorded",
    "ending_page_button_text": "Done"
  }
}
```

## Implementation Steps

1. **Landing Page**
   - Extract workspace and form slugs from URL
   - Fetch form details
   - Display landing page using form.settings

2. **Form Display**
   - Show questions in order
   - Render appropriate inputs based on question.type
   - Show required indicators for question.is_required
   - Display choices in order for choice-based questions

3. **Response Collection**
   - Start submission when user begins
   - Collect and validate responses
   - Track completion time
   - Submit all responses when done

4. **Completion**
   - Show ending page from form.settings
   - Handle redirect if specified

## Error Handling

```javascript
try {
  const form = await fetch(`/api/forms/${workspaceSlug}/${formSlug}`).then(r => r.json());
  if (form.error) {
    // Handle form not found
    showError('Form not found');
    return;
  }
  // Continue with form display
} catch (error) {
  // Handle network or other errors
  showError('Failed to load form');
}
```

Common error codes:
- `FORM_NOT_FOUND`: Invalid form or workspace slug
- `SUBMISSION_ERROR`: Failed to start/complete submission
- `VALIDATION_ERROR`: Invalid response data 