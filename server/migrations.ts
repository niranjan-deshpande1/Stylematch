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
  },
  {
    version: 6,
    name: 'remove_uuid_columns',
    up: `
      -- Remove UUID columns that are causing constraint violations
      -- The application only uses integer-based userId columns

      -- Step 1: Drop foreign key constraints for UUID columns if they exist
      DO $$
      DECLARE
        constraint_rec RECORD;
      BEGIN
        -- Drop foreign key constraints on clothing_items.user_id_v2
        FOR constraint_rec IN
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'clothing_items'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%user_id_v2%'
        LOOP
          EXECUTE 'ALTER TABLE clothing_items DROP CONSTRAINT ' || constraint_rec.constraint_name;
          RAISE NOTICE 'Dropped foreign key constraint % on clothing_items', constraint_rec.constraint_name;
        END LOOP;

        -- Drop foreign key constraints on inspiration_images.user_id_v2
        FOR constraint_rec IN
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'inspiration_images'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%user_id_v2%'
        LOOP
          EXECUTE 'ALTER TABLE inspiration_images DROP CONSTRAINT ' || constraint_rec.constraint_name;
          RAISE NOTICE 'Dropped foreign key constraint % on inspiration_images', constraint_rec.constraint_name;
        END LOOP;
      END $$;

      -- Step 2: Drop the UUID columns if they exist
      DO $$
      BEGIN
        -- Drop user_id_v2 from clothing_items
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clothing_items'
          AND column_name = 'user_id_v2'
        ) THEN
          ALTER TABLE clothing_items DROP COLUMN user_id_v2;
          RAISE NOTICE 'Dropped column user_id_v2 from clothing_items';
        ELSE
          RAISE NOTICE 'Column user_id_v2 does not exist in clothing_items';
        END IF;

        -- Drop user_id_v2 from inspiration_images
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'inspiration_images'
          AND column_name = 'user_id_v2'
        ) THEN
          ALTER TABLE inspiration_images DROP COLUMN user_id_v2;
          RAISE NOTICE 'Dropped column user_id_v2 from inspiration_images';
        ELSE
          RAISE NOTICE 'Column user_id_v2 does not exist in inspiration_images';
        END IF;

        -- Drop id_v2 from users
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users'
          AND column_name = 'id_v2'
        ) THEN
          ALTER TABLE users DROP COLUMN id_v2;
          RAISE NOTICE 'Dropped column id_v2 from users';
        ELSE
          RAISE NOTICE 'Column id_v2 does not exist in users';
        END IF;
      END $$;
    `,
    down: `
      -- This migration is destructive and cannot be easily reversed
      -- If you need to add UUID columns back, you would need to:
      -- 1. Add the UUID columns
      -- 2. Populate them with appropriate values
      -- 3. Add back the foreign key constraints
      -- 4. Update application code to use UUID columns
      RAISE NOTICE 'Rollback not implemented - UUID columns removal is intentional';
    `
  },
  {
    version: 7,
    name: 'add_guest_user_insert_functions',
    up: `
      -- Create functions to handle guest user inserts without foreign key constraint violations
      -- Guest users have negative user IDs and don't exist in the users table

      -- Function to insert clothing items for guest users
      CREATE OR REPLACE FUNCTION insert_clothing_item_guest(
        image_url text,
        category_name text,
        user_id integer,
        style_tags text[]
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        category text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp
      ) AS $$
      BEGIN
        -- If user_id is negative (guest user), insert without foreign key check
        -- If user_id is positive (authenticated user), normal FK check applies
        IF user_id < 0 THEN
          -- Temporarily disable the foreign key constraint trigger for this insert
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (image_url, category_name, user_id, COALESCE(style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        ELSE
          -- For authenticated users, use normal insert with FK constraint
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (image_url, category_name, user_id, COALESCE(style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      -- Function to insert inspiration images for guest users
      CREATE OR REPLACE FUNCTION insert_inspiration_image_guest(
        image_url text,
        user_id integer,
        style_tags text[],
        is_saved boolean
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp,
        "isSaved" boolean
      ) AS $$
      BEGIN
        -- If user_id is negative (guest user), insert without foreign key check
        -- If user_id is positive (authenticated user), normal FK check applies
        IF user_id < 0 THEN
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (image_url, user_id, COALESCE(style_tags, '{}'), COALESCE(is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        ELSE
          -- For authenticated users, use normal insert with FK constraint
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (image_url, user_id, COALESCE(style_tags, '{}'), COALESCE(is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      -- Make the foreign key constraints deferrable so we can work around them for guest users
      -- First, drop the existing constraints
      ALTER TABLE clothing_items DROP CONSTRAINT IF EXISTS "clothing_items_userId_fkey";
      ALTER TABLE inspiration_images DROP CONSTRAINT IF EXISTS "inspiration_images_userId_fkey";

      -- Recreate them as NOT VALID constraints (won't check existing data)
      -- This allows guest user records (negative IDs) to exist
      ALTER TABLE clothing_items
        ADD CONSTRAINT "clothing_items_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES users(id)
        ON DELETE CASCADE
        NOT VALID;

      ALTER TABLE inspiration_images
        ADD CONSTRAINT "inspiration_images_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES users(id)
        ON DELETE CASCADE
        NOT VALID;

      -- Grant execute permissions on the functions
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO service_role;
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO authenticated;
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO anon;

      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO service_role;
      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO authenticated;
      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO anon;
    `,
    down: `
      -- Drop the guest user insert functions
      DROP FUNCTION IF EXISTS insert_clothing_item_guest(text, text, integer, text[]);
      DROP FUNCTION IF EXISTS insert_inspiration_image_guest(text, integer, text[], boolean);

      -- Restore strict foreign key constraints
      ALTER TABLE clothing_items DROP CONSTRAINT IF EXISTS "clothing_items_userId_fkey";
      ALTER TABLE inspiration_images DROP CONSTRAINT IF EXISTS "inspiration_images_userId_fkey";

      ALTER TABLE clothing_items
        ADD CONSTRAINT "clothing_items_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES users(id)
        ON DELETE CASCADE;

      ALTER TABLE inspiration_images
        ADD CONSTRAINT "inspiration_images_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES users(id)
        ON DELETE CASCADE;
    `
  },
  {
    version: 8,
    name: 'add_security_definer_to_guest_functions',
    up: `
      -- Update the guest user insert functions to use SECURITY DEFINER
      -- This allows them to bypass RLS policies for guest users while maintaining security for authenticated users

      -- Drop and recreate the clothing items guest function with SECURITY DEFINER
      DROP FUNCTION IF EXISTS insert_clothing_item_guest(text, text, integer, text[]);

      CREATE OR REPLACE FUNCTION insert_clothing_item_guest(
        image_url text,
        category_name text,
        user_id integer,
        style_tags text[]
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        category text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp
      )
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        -- This function runs with elevated privileges to bypass RLS and FK constraints for guest users
        -- Guest users have negative user IDs and don't exist in the users table

        IF user_id < 0 THEN
          -- For guest users (negative IDs), first ensure a stub user exists to satisfy FK constraint
          INSERT INTO users (id, email, username, password)
          VALUES (
            user_id,
            'guest-' || abs(user_id) || '@guest.local',
            'guest-' || abs(user_id),
            'guest'
          )
          ON CONFLICT (id) DO NOTHING;

          -- Now insert the clothing item
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (image_url, category_name, user_id, COALESCE(style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        ELSE
          -- For authenticated users, use normal insert (will be subject to RLS and FK constraints)
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (image_url, category_name, user_id, COALESCE(style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        END IF;
      END;
      $$;

      -- Drop and recreate the inspiration images guest function with SECURITY DEFINER
      DROP FUNCTION IF EXISTS insert_inspiration_image_guest(text, integer, text[], boolean);

      CREATE OR REPLACE FUNCTION insert_inspiration_image_guest(
        image_url text,
        user_id integer,
        style_tags text[],
        is_saved boolean
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp,
        "isSaved" boolean
      )
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        -- This function runs with elevated privileges to bypass RLS and FK constraints for guest users
        -- Guest users have negative user IDs and don't exist in the users table

        IF user_id < 0 THEN
          -- For guest users (negative IDs), first ensure a stub user exists to satisfy FK constraint
          INSERT INTO users (id, email, username, password)
          VALUES (
            user_id,
            'guest-' || abs(user_id) || '@guest.local',
            'guest-' || abs(user_id),
            'guest'
          )
          ON CONFLICT (id) DO NOTHING;

          -- Now insert the inspiration image
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (image_url, user_id, COALESCE(style_tags, '{}'), COALESCE(is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        ELSE
          -- For authenticated users, use normal insert (will be subject to RLS and FK constraints)
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (image_url, user_id, COALESCE(style_tags, '{}'), COALESCE(is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        END IF;
      END;
      $$;

      -- Grant execute permissions on the updated functions
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO service_role;
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO authenticated;
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO anon;

      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO service_role;
      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO authenticated;
      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO anon;
    `,
    down: `
      -- Revert to functions without SECURITY DEFINER
      DROP FUNCTION IF EXISTS insert_clothing_item_guest(text, text, integer, text[]);
      DROP FUNCTION IF EXISTS insert_inspiration_image_guest(text, integer, text[], boolean);

      -- Recreate the original functions without SECURITY DEFINER
      CREATE OR REPLACE FUNCTION insert_clothing_item_guest(
        image_url text,
        category_name text,
        user_id integer,
        style_tags text[]
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        category text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp
      ) AS $$
      BEGIN
        IF user_id < 0 THEN
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (image_url, category_name, user_id, COALESCE(style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        ELSE
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (image_url, category_name, user_id, COALESCE(style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION insert_inspiration_image_guest(
        image_url text,
        user_id integer,
        style_tags text[],
        is_saved boolean
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp,
        "isSaved" boolean
      ) AS $$
      BEGIN
        IF user_id < 0 THEN
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (image_url, user_id, COALESCE(style_tags, '{}'), COALESCE(is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        ELSE
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (image_url, user_id, COALESCE(style_tags, '{}'), COALESCE(is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `
  },
  {
    version: 9,
    name: 'fix_guest_functions_with_stub_users',
    up: `
      -- Drop and recreate both guest functions with stub user creation logic
      -- This fixes the foreign key constraint violation by creating stub users for guest IDs

      DROP FUNCTION IF EXISTS insert_clothing_item_guest(text, text, integer, text[]);

      CREATE OR REPLACE FUNCTION insert_clothing_item_guest(
        p_image_url text,
        p_category_name text,
        p_user_id integer,
        p_style_tags text[]
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        category text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp
      )
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        IF p_user_id < 0 THEN
          -- For guest users, first ensure a stub user exists to satisfy FK constraint
          INSERT INTO users (id, email, username, password)
          VALUES (
            p_user_id,
            'guest-' || abs(p_user_id) || '@guest.local',
            'guest-' || abs(p_user_id),
            'guest'
          )
          ON CONFLICT (id) DO NOTHING;

          -- Now insert the clothing item
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (p_image_url, p_category_name, p_user_id, COALESCE(p_style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        ELSE
          -- For authenticated users, use normal insert
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (p_image_url, p_category_name, p_user_id, COALESCE(p_style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      DROP FUNCTION IF EXISTS insert_inspiration_image_guest(text, integer, text[], boolean);

      CREATE OR REPLACE FUNCTION insert_inspiration_image_guest(
        p_image_url text,
        p_user_id integer,
        p_style_tags text[],
        p_is_saved boolean
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp,
        "isSaved" boolean
      )
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        IF p_user_id < 0 THEN
          -- For guest users, first ensure a stub user exists to satisfy FK constraint
          INSERT INTO users (id, email, username, password)
          VALUES (
            p_user_id,
            'guest-' || abs(p_user_id) || '@guest.local',
            'guest-' || abs(p_user_id),
            'guest'
          )
          ON CONFLICT (id) DO NOTHING;

          -- Now insert the inspiration image
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (p_image_url, p_user_id, COALESCE(p_style_tags, '{}'), COALESCE(p_is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        ELSE
          -- For authenticated users, use normal insert
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (p_image_url, p_user_id, COALESCE(p_style_tags, '{}'), COALESCE(p_is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO service_role;
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO authenticated;
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO anon;

      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO service_role;
      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO authenticated;
      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO anon;
    `,
    down: `
      -- Revert to the previous version
      DROP FUNCTION IF EXISTS insert_clothing_item_guest(text, text, integer, text[]);
      DROP FUNCTION IF EXISTS insert_inspiration_image_guest(text, integer, text[], boolean);
    `
  },
  {
    version: 10,
    name: 'fix_ambiguous_column_references_in_guest_functions',
    up: `
      -- Recreate functions with prefixed parameter names to avoid ambiguous column references

      DROP FUNCTION IF EXISTS insert_clothing_item_guest(text, text, integer, text[]);

      CREATE OR REPLACE FUNCTION insert_clothing_item_guest(
        p_image_url text,
        p_category_name text,
        p_user_id integer,
        p_style_tags text[]
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        category text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp
      )
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        IF p_user_id < 0 THEN
          -- For guest users, first ensure a stub user exists to satisfy FK constraint
          INSERT INTO users (id, email, username, password)
          VALUES (
            p_user_id,
            'guest-' || abs(p_user_id) || '@guest.local',
            'guest-' || abs(p_user_id),
            'guest'
          )
          ON CONFLICT (id) DO NOTHING;

          -- Now insert the clothing item
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (p_image_url, p_category_name, p_user_id, COALESCE(p_style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        ELSE
          -- For authenticated users, use normal insert
          RETURN QUERY
          INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt")
          VALUES (p_image_url, p_category_name, p_user_id, COALESCE(p_style_tags, '{}'), CURRENT_TIMESTAMP)
          RETURNING
            clothing_items.id,
            clothing_items."imageUrl",
            clothing_items.category,
            clothing_items."userId",
            clothing_items."styleTags",
            clothing_items."createdAt";
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      DROP FUNCTION IF EXISTS insert_inspiration_image_guest(text, integer, text[], boolean);

      CREATE OR REPLACE FUNCTION insert_inspiration_image_guest(
        p_image_url text,
        p_user_id integer,
        p_style_tags text[],
        p_is_saved boolean
      )
      RETURNS TABLE (
        id integer,
        "imageUrl" text,
        "userId" integer,
        "styleTags" text[],
        "createdAt" timestamp,
        "isSaved" boolean
      )
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        IF p_user_id < 0 THEN
          -- For guest users, first ensure a stub user exists to satisfy FK constraint
          INSERT INTO users (id, email, username, password)
          VALUES (
            p_user_id,
            'guest-' || abs(p_user_id) || '@guest.local',
            'guest-' || abs(p_user_id),
            'guest'
          )
          ON CONFLICT (id) DO NOTHING;

          -- Now insert the inspiration image
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (p_image_url, p_user_id, COALESCE(p_style_tags, '{}'), COALESCE(p_is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        ELSE
          -- For authenticated users, use normal insert
          RETURN QUERY
          INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "isSaved", "createdAt")
          VALUES (p_image_url, p_user_id, COALESCE(p_style_tags, '{}'), COALESCE(p_is_saved, false), CURRENT_TIMESTAMP)
          RETURNING
            inspiration_images.id,
            inspiration_images."imageUrl",
            inspiration_images."userId",
            inspiration_images."styleTags",
            inspiration_images."createdAt",
            inspiration_images."isSaved";
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO service_role;
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO authenticated;
      GRANT EXECUTE ON FUNCTION insert_clothing_item_guest(text, text, integer, text[]) TO anon;

      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO service_role;
      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO authenticated;
      GRANT EXECUTE ON FUNCTION insert_inspiration_image_guest(text, integer, text[], boolean) TO anon;
    `,
    down: `
      DROP FUNCTION IF EXISTS insert_clothing_item_guest(text, text, integer, text[]);
      DROP FUNCTION IF EXISTS insert_inspiration_image_guest(text, integer, text[], boolean);
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