import { createClient } from '@supabase/supabase-js';

interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

// Database migrations for Supabase schema management
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_supabase_schema',
    up: `
      -- Create users table with Supabase-compatible structure
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create inspiration_images table (note: using "userId" to match existing code)
      CREATE TABLE IF NOT EXISTS inspiration_images (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "imageUrl" VARCHAR(255) NOT NULL,
        "styleTags" TEXT[] DEFAULT '{}',
        "isSaved" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create clothing_items table (note: using "userId" to match existing code)
      CREATE TABLE IF NOT EXISTS clothing_items (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "imageUrl" VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        "styleTags" TEXT[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance (only if they don't exist)
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_inspiration_images_user_id ON inspiration_images("userId");
      CREATE INDEX IF NOT EXISTS idx_clothing_items_user_id ON clothing_items("userId");
      CREATE INDEX IF NOT EXISTS idx_clothing_items_category ON clothing_items(category);

      -- Ensure all columns exist (alter table if needed)
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
          ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspiration_images' AND column_name = 'createdAt') THEN
          ALTER TABLE inspiration_images ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clothing_items' AND column_name = 'createdAt') THEN
          ALTER TABLE clothing_items ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `,
    down: `
      DROP TABLE IF EXISTS clothing_items;
      DROP TABLE IF EXISTS inspiration_images;
      DROP TABLE IF EXISTS users;
    `
  },
  {
    version: 2,
    name: 'session_table_optimization',
    up: `
      -- Ensure session table exists with proper structure
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default" PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );

      -- Add index for better session cleanup performance
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);

      -- Create migrations tracking table
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    down: `
      DROP INDEX IF EXISTS "IDX_session_expire";
      DROP TABLE IF EXISTS schema_migrations;
    `
  },
  {
    version: 3,
    name: 'setup_rls_and_user_context',
    up: `
      -- Create the RLS function to set current user context
      CREATE OR REPLACE FUNCTION set_request_user_id(uid integer)
      RETURNS void AS $$
      BEGIN
        PERFORM set_config('app.current_user_id', uid::text, false);
      END;
      $$ LANGUAGE plpgsql;

      -- Enable RLS on inspiration_images table
      ALTER TABLE inspiration_images ENABLE ROW LEVEL SECURITY;

      -- Create RLS policy for inspiration_images
      DROP POLICY IF EXISTS "Users can only access their own inspiration images" ON inspiration_images;
      CREATE POLICY "Users can only access their own inspiration images" ON inspiration_images
        FOR ALL USING (
          "userId" = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::integer,
            -1
          )
        );

      -- Enable RLS on clothing_items table
      ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;

      -- Create RLS policy for clothing_items
      DROP POLICY IF EXISTS "Users can only access their own clothing items" ON clothing_items;
      CREATE POLICY "Users can only access their own clothing items" ON clothing_items
        FOR ALL USING (
          "userId" = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::integer,
            -1
          )
        );

      -- Grant execute permission on the function to service role
      GRANT EXECUTE ON FUNCTION set_request_user_id(integer) TO service_role;
      GRANT EXECUTE ON FUNCTION set_request_user_id(integer) TO authenticated;
      GRANT EXECUTE ON FUNCTION set_request_user_id(integer) TO anon;
    `,
    down: `
      -- Drop RLS policies
      DROP POLICY IF EXISTS "Users can only access their own inspiration images" ON inspiration_images;
      DROP POLICY IF EXISTS "Users can only access their own clothing items" ON clothing_items;

      -- Disable RLS
      ALTER TABLE inspiration_images DISABLE ROW LEVEL SECURITY;
      ALTER TABLE clothing_items DISABLE ROW LEVEL SECURITY;

      -- Drop the function
      DROP FUNCTION IF EXISTS set_request_user_id(integer);
    `
  },
  {
    version: 4,
    name: 'fix_users_table_rls_policies',
    up: `
      -- Enable RLS on users table (if not already enabled)
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Service role full access to users" ON users;
      DROP POLICY IF EXISTS "Allow user registration" ON users;
      DROP POLICY IF EXISTS "Users can only read their own data" ON users;
      DROP POLICY IF EXISTS "Users can only update their own data" ON users;

      -- Allow service role to do everything (for backend operations)
      CREATE POLICY "Service role full access to users" ON users
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true);

      -- Allow user registration (INSERT) for anon and authenticated roles
      CREATE POLICY "Allow user registration" ON users
        FOR INSERT TO anon, authenticated
        WITH CHECK (true);

      -- Users can only read their own user record when authenticated
      CREATE POLICY "Users can only read their own data" ON users
        FOR SELECT TO authenticated
        USING (
          id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::integer,
            -1
          )
        );

      -- Users can only update their own record when authenticated
      CREATE POLICY "Users can only update their own data" ON users
        FOR UPDATE TO authenticated
        USING (
          id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::integer,
            -1
          )
        )
        WITH CHECK (
          id = COALESCE(
            NULLIF(current_setting('app.current_user_id', true), '')::integer,
            -1
          )
        );
    `,
    down: `
      -- Drop all user table policies
      DROP POLICY IF EXISTS "Service role full access to users" ON users;
      DROP POLICY IF EXISTS "Allow user registration" ON users;
      DROP POLICY IF EXISTS "Users can only read their own data" ON users;
      DROP POLICY IF EXISTS "Users can only update their own data" ON users;

      -- Disable RLS on users table
      ALTER TABLE users DISABLE ROW LEVEL SECURITY;
    `
  },
  {
    version: 5,
    name: 'completely_disable_users_rls',
    up: `
      -- Remove all RLS policies from users table
      DROP POLICY IF EXISTS "Service role full access to users" ON users;
      DROP POLICY IF EXISTS "Allow user registration" ON users;
      DROP POLICY IF EXISTS "Users can only read their own data" ON users;
      DROP POLICY IF EXISTS "Users can only update their own data" ON users;

      -- Completely disable RLS on users table since Supabase service-level RLS blocks registration
      ALTER TABLE users DISABLE ROW LEVEL SECURITY;

      -- Add comment explaining why RLS is disabled
      COMMENT ON TABLE users IS 'RLS disabled: Supabase service-level RLS conflicts with custom authentication. User data isolation maintained via application-level session management and RLS on data tables.';

      -- Ensure users table has proper structure
      ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
    `,
    down: `
      -- Re-enable RLS and restore policies if needed
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Service role full access to users" ON users
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true);
    `
  }
];

export class MigrationRunner {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async runMigrations(): Promise<void> {
    try {
      // Ensure migrations table exists
      const { error: createError } = await this.supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `
      });

      if (createError) {
        console.error('Error creating migrations table:', createError);
        throw createError;
      }

      // Get applied migrations
      const { data: appliedMigrations, error: fetchError } = await this.supabase
        .from('schema_migrations')
        .select('version')
        .order('version');

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = table doesn't exist
        console.error('Error fetching applied migrations:', fetchError);
        throw fetchError;
      }

      const appliedVersions = new Set((appliedMigrations || []).map((row: any) => row.version));

      // Apply pending migrations
      for (const migration of migrations) {
        if (!appliedVersions.has(migration.version)) {
          try {
            // Execute migration SQL
            const { error: migrationError } = await this.supabase.rpc('exec_sql', {
              sql: migration.up
            });

            if (migrationError) {
              console.error(`Failed to apply migration ${migration.version}:`, migrationError);
              throw migrationError;
            }

            // Record migration as applied
            const { error: recordError } = await this.supabase
              .from('schema_migrations')
              .insert([{ version: migration.version, name: migration.name }]);

            if (recordError) {
              console.error(`Failed to record migration ${migration.version}:`, recordError);
              throw recordError;
            }
          } catch (error) {
            console.error(`Failed to apply migration ${migration.version}:`, error);
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Migration process failed:', error);
      throw error;
    }
  }

  async rollbackMigration(version: number): Promise<void> {
    try {
      const migration = migrations.find(m => m.version === version);
      if (!migration) {
        throw new Error(`Migration version ${version} not found`);
      }

      // Execute rollback SQL
      const { error: rollbackError } = await this.supabase.rpc('exec_sql', {
        sql: migration.down
      });

      if (rollbackError) {
        console.error(`Failed to rollback migration ${version}:`, rollbackError);
        throw rollbackError;
      }

      // Remove migration record
      const { error: deleteError } = await this.supabase
        .from('schema_migrations')
        .delete()
        .eq('version', version);

      if (deleteError) {
        console.error(`Failed to remove migration record ${version}:`, deleteError);
        throw deleteError;
      }
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
}

// Initialize and run migrations for Supabase
export async function initializeMigrations(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return;
  }

  const runner = new MigrationRunner(supabaseUrl, supabaseServiceKey);
  await runner.runMigrations();
}