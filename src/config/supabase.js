const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-my-custom-header': 'my-app-name'
      }
    }
  }
);

// Helper to set auth token
const setAuthToken = (accessToken) => {
  if (accessToken) {
    supabase.auth.setSession({ access_token: accessToken });
  }
};

module.exports = { supabase, setAuthToken }; 