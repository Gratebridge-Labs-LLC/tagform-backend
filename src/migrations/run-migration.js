const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
  // Extract connection details from Supabase URL
  const supabaseUrl = new URL(process.env.SUPABASE_URL);
  const host = supabaseUrl.hostname;
  const database = supabaseUrl.pathname.substring(1);

  // Create PostgreSQL connection pool
  const pool = new Pool({
    host,
    database,
    port: 5432,
    user: 'postgres',
    password: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Read migration file
    const migration = fs.readFileSync(
      path.join(__dirname, '20240315_add_workspace_slug.sql'),
      'utf8'
    );

    // Run migration
    await pool.query(migration);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 