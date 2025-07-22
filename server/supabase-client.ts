import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@shared/schema';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// For Drizzle ORM, we need the direct database connection
// Extract the project ref from the Supabase URL
const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl.split('//')[1].split('.')[0];

// Build the connection string for Supabase database
const connectionString = `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;

const sql = postgres(connectionString);
export const db = drizzle(sql, { schema });