const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupSupabase() {
  try {
    console.log('🚀 Setting up Supabase database...');

    // Enable pgvector extension
    const { error: extensionError } = await supabase.rpc('enable_pgvector');
    if (extensionError) {
      console.log('Note: pgvector might already be enabled:', extensionError.message);
    }

    // Create documents table
    const { error: tableError } = await supabase.rpc('create_documents_table');
    if (tableError) {
      console.log('Note: documents table might already exist:', tableError.message);
    }

    // Create match_documents function
    const { error: functionError } = await supabase.rpc('create_match_documents_function');
    if (functionError) {
      console.log('Note: match_documents function might already exist:', functionError.message);
    }

    console.log('✅ Supabase setup completed!');
  } catch (error) {
    console.error('Error setting up Supabase:', error);
  }
}

setupSupabase();
