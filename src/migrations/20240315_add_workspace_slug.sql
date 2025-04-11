-- Create exec_sql function if it doesn't exist
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add slug column to workspaces table
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create a unique index on the slug column
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_idx ON workspaces (slug);

-- Generate slugs for existing workspaces
UPDATE workspaces 
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

-- Make slug column required after populating existing rows
ALTER TABLE workspaces ALTER COLUMN slug SET NOT NULL; 