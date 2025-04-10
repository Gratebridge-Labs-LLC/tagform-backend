# Form System Documentation

## API Endpoints

### Forms
Base path: `/api/workspaces/:workspaceId/forms`

```typescript
// List forms in workspace
GET /api/workspaces/:workspaceId/forms
Response: Form[]

// Create form in workspace
POST /api/workspaces/:workspaceId/forms
Body: {
  name: string;
  description?: string;
  is_private?: boolean;
}
Response: Form

// Get specific form
GET /api/workspaces/:workspaceId/forms/:formId
Response: Form

// Update form
PUT /api/workspaces/:workspaceId/forms/:formId
Body: {
  name: string;
  description?: string;
  is_private?: boolean;
}
Response: Form

// Delete form
DELETE /api/workspaces/:workspaceId/forms/:formId
Response: 204 No Content
```

### Questions
Base path: `/api/workspaces/:workspaceId/forms/:formId/questions`

```typescript
// Create question
POST /api/workspaces/:workspaceId/forms/:formId/questions
Body: {
  type: QuestionType;
  text: string;
  description?: string;
  is_required?: boolean;
  max_chars?: number;
  choices?: { text: string; order: number; }[];  // For multiple-choice/dropdown
}
Response: Question

// Update question
PUT /api/workspaces/:workspaceId/forms/:formId/questions/:questionId
Body: {
  text: string;
  description?: string;
  is_required?: boolean;
  max_chars?: number;
  choices?: { text: string; order: number; }[];
}
Response: Question

// Delete question
DELETE /api/workspaces/:workspaceId/forms/:formId/questions/:questionId
Response: 204 No Content

// Reorder questions
POST /api/workspaces/:workspaceId/forms/:formId/questions/reorder
Body: {
  questionIds: string[];  // Array of question UUIDs in desired order
}
Response: 204 No Content
```

### Form Settings
Base path: `/api/workspaces/:workspaceId/forms/:formId/settings`

```typescript
// Get form settings
GET /api/workspaces/:workspaceId/forms/:formId/settings
Response: FormSettings

// Update form settings
PUT /api/workspaces/:workspaceId/forms/:formId/settings
Body: {
  landing_page_title: string;
  landing_page_description?: string;
  landing_page_button_text: string;
  show_progress_bar?: boolean;
  ending_page_title: string;
  ending_page_description?: string;
  ending_page_button_text: string;
  redirect_url?: string;
}
Response: FormSettings
```

## Data Types

```typescript
// Main form structure
interface Form {
  id: string;                 // UUID
  workspace_id: string;       // UUID - References workspace
  name: string;              // Form name
  description?: string;      // Optional form description
  is_private: boolean;       // Whether form is private
  created_at: string;        // ISO timestamp
  updated_at: string;        // ISO timestamp
  
  // Relationships
  questions?: Question[];    // Array of questions in this form
  settings?: FormSettings;   // Form settings
}

// Question types supported by the system
type QuestionType = 
  | 'multiple-choice'  // Multiple choice with radio buttons
  | 'dropdown'         // Dropdown select
  | 'yes-no'          // Yes/No boolean choice
  | 'checkbox'        // Multiple selection checkboxes
  | 'short-text'      // Single line text input
  | 'long-text'       // Multi-line text area
  | 'email'           // Email input with validation
  | 'phone'           // Phone number input
  | 'address'         // Address input fields
  | 'website'         // URL input with validation
  | 'date';           // Date picker

// Question structure
interface Question {
  id: string;              // UUID
  form_id: string;         // UUID - References parent form
  type: QuestionType;      // Type of question
  text: string;            // Question text/label
  description?: string;    // Optional help text
  is_required: boolean;    // Whether answer is required
  max_chars?: number;      // For text inputs
  order: number;           // Display order in form
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
  
  // Relationships
  choices?: QuestionChoice[]; // For multiple-choice/dropdown
}

// Choice options for multiple choice/dropdown questions
interface QuestionChoice {
  id: string;             // UUID
  question_id: string;    // UUID - References parent question
  text: string;           // Choice text
  order: number;          // Display order in choices
  created_at: string;     // ISO timestamp
  updated_at: string;     // ISO timestamp
}

// Form display and behavior settings
interface FormSettings {
  id: string;                     // UUID
  form_id: string;                // UUID - References parent form
  landing_page_title: string;     // Form landing page title
  landing_page_description?: string; // Optional landing description
  landing_page_button_text: string;  // Start button text
  show_progress_bar: boolean;     // Show/hide progress bar
  ending_page_title: string;      // Completion page title
  ending_page_description?: string;  // Optional completion text
  ending_page_button_text: string;   // Finish button text
  redirect_url?: string;          // Optional redirect after completion
  created_at: string;             // ISO timestamp
  updated_at: string;             // ISO timestamp
}
```

## Example API Usage

```typescript
// Example: Creating a form with questions
const createFormWithQuestions = async (workspaceId: string) => {
  // 1. Create the form
  const form = await fetch(`/api/workspaces/${workspaceId}/forms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-token'
    },
    body: JSON.stringify({
      name: 'Customer Feedback',
      description: 'Please share your experience',
      is_private: false
    })
  }).then(res => res.json());

  // 2. Add a multiple choice question
  const question1 = await fetch(`/api/workspaces/${workspaceId}/forms/${form.id}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-token'
    },
    body: JSON.stringify({
      type: 'multiple-choice',
      text: 'How satisfied are you?',
      is_required: true,
      choices: [
        { text: 'Very Satisfied', order: 1 },
        { text: 'Satisfied', order: 2 },
        { text: 'Neutral', order: 3 }
      ]
    })
  }).then(res => res.json());

  // 3. Configure form settings
  const settings = await fetch(`/api/workspaces/${workspaceId}/forms/${form.id}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-token'
    },
    body: JSON.stringify({
      landing_page_title: 'Customer Feedback Survey',
      landing_page_button_text: 'Start Survey',
      ending_page_title: 'Thank You!',
      ending_page_button_text: 'Submit',
      show_progress_bar: true
    })
  }).then(res => res.json());

  return { form, questions: [question1], settings };
};
```

## Authentication

All endpoints require authentication via Bearer token:
```typescript
headers: {
  'Authorization': 'Bearer your-jwt-token'
}
```

## Error Handling

All endpoints may return:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Server Error`: Internal error

Error response format:
```typescript
{
  error: string;
}
```

## Core Data Types

```typescript
// Main form structure
interface Form {
  id: string;                 // UUID
  workspace_id: string;       // UUID - References workspace
  name: string;              // Form name
  description?: string;      // Optional form description
  is_private: boolean;       // Whether form is private
  created_at: string;        // ISO timestamp
  updated_at: string;        // ISO timestamp
  
  // Relationships
  questions?: Question[];    // Array of questions in this form
  settings?: FormSettings;   // Form settings
}

// Question types supported by the system
type QuestionType = 
  | 'multiple-choice'  // Multiple choice with radio buttons
  | 'dropdown'         // Dropdown select
  | 'yes-no'          // Yes/No boolean choice
  | 'checkbox'        // Multiple selection checkboxes
  | 'short-text'      // Single line text input
  | 'long-text'       // Multi-line text area
  | 'email'           // Email input with validation
  | 'phone'           // Phone number input
  | 'address'         // Address input fields
  | 'website'         // URL input with validation
  | 'date';           // Date picker

// Question structure
interface Question {
  id: string;              // UUID
  form_id: string;         // UUID - References parent form
  type: QuestionType;      // Type of question
  text: string;            // Question text/label
  description?: string;    // Optional help text
  is_required: boolean;    // Whether answer is required
  max_chars?: number;      // For text inputs
  order: number;           // Display order in form
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
  
  // Relationships
  choices?: QuestionChoice[]; // For multiple-choice/dropdown
}

// Choice options for multiple choice/dropdown questions
interface QuestionChoice {
  id: string;             // UUID
  question_id: string;    // UUID - References parent question
  text: string;           // Choice text
  order: number;          // Display order in choices
  created_at: string;     // ISO timestamp
  updated_at: string;     // ISO timestamp
}

// Form display and behavior settings
interface FormSettings {
  id: string;                     // UUID
  form_id: string;                // UUID - References parent form
  landing_page_title: string;     // Form landing page title
  landing_page_description?: string; // Optional landing description
  landing_page_button_text: string;  // Start button text
  show_progress_bar: boolean;     // Show/hide progress bar
  ending_page_title: string;      // Completion page title
  ending_page_description?: string;  // Optional completion text
  ending_page_button_text: string;   // Finish button text
  redirect_url?: string;          // Optional redirect after completion
  created_at: string;             // ISO timestamp
  updated_at: string;             // ISO timestamp
}
```

## Relationships & Rules

1. Form → Questions (1:Many)
   - A form can have multiple questions
   - Questions belong to exactly one form
   - Questions are ordered using the `order` field
   - Deleting a form cascades to its questions

2. Question → Choices (1:Many)
   - Multiple-choice and dropdown questions can have multiple choices
   - Choices belong to exactly one question
   - Choices are ordered using the `order` field
   - Deleting a question cascades to its choices

3. Form → Settings (1:1)
   - Each form has exactly one settings record
   - Settings belong to exactly one form
   - Deleting a form cascades to its settings

## Validation Rules

### Forms
- `name` is required
- `workspace_id` must reference a valid workspace
- `is_private` defaults to true if not specified

### Questions
- `text` is required
- `type` must be one of the defined QuestionTypes
- `is_required` defaults to false if not specified
- `order` must be a positive integer
- `max_chars` only applies to text-based questions
- Multiple-choice/dropdown questions must have at least one choice

### Question Choices
- `text` is required
- `order` must be a positive integer
- Can only be added to multiple-choice or dropdown questions

### Form Settings
- `landing_page_title` and `ending_page_title` are required
- `landing_page_button_text` and `ending_page_button_text` are required
- `show_progress_bar` defaults to true if not specified
- `redirect_url` must be a valid URL if provided

## Security Rules

1. Form Access
   - Users can only access forms in their workspaces
   - Public forms in public workspaces are accessible to all
   - Private forms are only accessible to workspace owners

2. Question Access
   - Inherits access rules from parent form
   - Only form owners can create/edit/delete questions

3. Choice Access
   - Inherits access rules from parent question
   - Only form owners can create/edit/delete choices

4. Settings Access
   - Inherits access rules from parent form
   - Only form owners can view/edit settings

## Example Usage

```typescript
// Example form with questions and choices
const formExample: Form = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  workspace_id: "a716446655440000-e29b-41d4-550e8400",
  name: "Customer Feedback",
  description: "Please share your experience with our service",
  is_private: false,
  questions: [
    {
      id: "q1",
      form_id: "550e8400-e29b-41d4-a716-446655440000",
      type: "multiple-choice",
      text: "How satisfied are you with our service?",
      is_required: true,
      order: 1,
      choices: [
        { id: "c1", question_id: "q1", text: "Very Satisfied", order: 1 },
        { id: "c2", question_id: "q1", text: "Satisfied", order: 2 },
        { id: "c3", question_id: "q1", text: "Neutral", order: 3 },
        { id: "c4", question_id: "q1", text: "Dissatisfied", order: 4 }
      ]
    },
    {
      id: "q2",
      form_id: "550e8400-e29b-41d4-a716-446655440000",
      type: "long-text",
      text: "What could we improve?",
      description: "Please provide specific examples",
      is_required: false,
      max_chars: 1000,
      order: 2
    }
  ],
  settings: {
    id: "s1",
    form_id: "550e8400-e29b-41d4-a716-446655440000",
    landing_page_title: "Customer Feedback Survey",
    landing_page_description: "Help us serve you better",
    landing_page_button_text: "Start Survey",
    show_progress_bar: true,
    ending_page_title: "Thank You!",
    ending_page_description: "We appreciate your feedback",
    ending_page_button_text: "Submit"
  }
};
``` 