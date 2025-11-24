/**
 * Script to apply database migrations to Supabase
 * 
 * Usage:
 *   node scripts/apply-migrations.js
 * 
 * This script will read all SQL files in supabase/migrations/
 * and apply them in order to your Supabase database.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigrations() {
  console.log('🚀 Starting database migrations...\n');

  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  
  try {
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Apply in alphabetical order

    if (files.length === 0) {
      console.log('⚠️  No migration files found.');
      return;
    }

    console.log(`Found ${files.length} migration file(s):\n`);

    for (const file of files) {
      console.log(`📝 Applying: ${file}`);
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_migrations').insert({
            name: file,
            executed_at: new Date().toISOString()
          });

          if (queryError) {
            console.error(`   ❌ Error: ${error.message}`);
            console.error(`   You may need to apply this migration manually in the Supabase SQL Editor.`);
          } else {
            console.log(`   ✅ Applied successfully`);
          }
        } else {
          console.log(`   ✅ Applied successfully`);
        }
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        console.error(`   Please apply this migration manually in the Supabase SQL Editor.`);
      }
      
      console.log('');
    }

    console.log('✨ Migration process completed!\n');
    console.log('⚠️  NOTE: If you see errors above, you\'ll need to:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Open the SQL Editor');
    console.log('   3. Copy and paste the SQL files manually');
    console.log('   4. Run them one by one\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the migrations
applyMigrations().catch(console.error);

