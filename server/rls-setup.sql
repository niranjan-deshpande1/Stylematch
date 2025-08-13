
-- Row Level Security setup for StyleMatch
-- This ensures data isolation at the database level

-- Step 1: Create the function to set current user ID in session
CREATE OR REPLACE FUNCTION set_request_user_id(uid integer)
RETURNS void
LANGUAGE sql
AS $$
  SELECT set_config('request.jwt.claim.user_id', uid::text, false);
$$;

-- Step 2: Helper function to get current user ID from session
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.user_id', true)::integer, 0);
$$;

-- Step 3: Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop any existing policies
DROP POLICY IF EXISTS "Users can access own data" ON users;
DROP POLICY IF EXISTS "Users can access own inspiration images" ON inspiration_images;
DROP POLICY IF EXISTS "Users can manage own inspiration images" ON inspiration_images;
DROP POLICY IF EXISTS "Users can access own clothing items" ON clothing_items;
DROP POLICY IF EXISTS "Users can manage own clothing items" ON clothing_items;

-- Step 5: Create RLS policies for users table
CREATE POLICY "Users can access own data" ON users
  FOR ALL USING ("id" = get_current_user_id());

-- Step 6: Create RLS policies for inspiration_images table
CREATE POLICY "Users can access own inspiration images" ON inspiration_images
  FOR SELECT USING ("userId" = get_current_user_id());

CREATE POLICY "Users can manage own inspiration images" ON inspiration_images
  FOR ALL USING ("userId" = get_current_user_id());

-- Step 7: Create RLS policies for clothing_items table  
CREATE POLICY "Users can access own clothing items" ON clothing_items
  FOR SELECT USING ("userId" = get_current_user_id());

CREATE POLICY "Users can manage own clothing items" ON clothing_items
  FOR ALL USING ("userId" = get_current_user_id());

-- Step 8: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION set_request_user_id(integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated, anon;
