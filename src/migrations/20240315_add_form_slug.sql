-- Add slug column to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create a unique index on workspace_id and slug to ensure uniqueness within a workspace
CREATE UNIQUE INDEX IF NOT EXISTS forms_workspace_slug_idx ON forms (workspace_id, slug) WHERE slug IS NOT NULL;

-- Generate slugs for existing forms
UPDATE forms 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      name, 
      '[^a-zA-Z0-9\s-]', 
      ''
    ),
    '\s+',
    '-'
  )
)
WHERE slug IS NULL; 