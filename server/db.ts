import { createClient } from '@supabase/supabase-js';
import { User, InsertUser, InspirationImage, InsertInspirationImage, ClothingItem, InsertClothingItem } from '@shared/schema';

// Initialize Supabase client

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:');
  console.error('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to set the current user ID for RLS
export async function setRequestUserId(userId: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_request_user_id', { uid: userId });
    if (error) {
      console.error('Error setting request user ID:', error);
    }
  } catch (error) {
    console.error('Error setting request user ID:', error);
  }
}

// Initialize the database on startup
export async function initDatabase() {
  try {
    // Check if tables already exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'inspiration_images', 'clothing_items']);

    if (error) {
      console.error('Error checking tables:', error);
    }

    if (tables && tables.length >= 3) {
      return;
    }

    // Create tables using SQL functions if they don't exist
    const createTablesSQL = `
      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );

      -- Create inspiration_images table
      CREATE TABLE IF NOT EXISTS inspiration_images (
        id SERIAL PRIMARY KEY,
        "imageUrl" TEXT NOT NULL,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        "styleTags" TEXT[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "isSaved" BOOLEAN DEFAULT FALSE
      );

      -- Create clothing_items table
      CREATE TABLE IF NOT EXISTS clothing_items (
        id SERIAL PRIMARY KEY,
        "imageUrl" TEXT NOT NULL,
        category TEXT NOT NULL,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        "styleTags" TEXT[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTablesSQL });

    if (createError) {
      console.error('Error creating tables:', createError);
      throw createError;
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// User operations
export async function getUser(id: number): Promise<User | undefined> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error in getUser:', error);
      return undefined;
    }

    return data || undefined;
  } catch (error) {
    console.error('Error in getUser:', error);
    return undefined;
  }
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error in getUserByUsername:', error);
      return undefined;
    }

    return data || undefined;
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return undefined;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error in getUserByEmail:', error);
      return undefined;
    }

    return data || undefined;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return undefined;
  }
}

export async function createUser(user: InsertUser): Promise<User> {
  try {
    // Use standard Supabase insert now that RLS is completely disabled
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) {
      console.error('Error in createUser:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No user data returned from database');
    }

    return data;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

// Inspiration image operations
export async function getInspirationImages(userId?: number): Promise<InspirationImage[]> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    // With RLS enabled, we don't need to filter by userId in the query
    const { data, error } = await supabase
      .from('inspiration_images')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error in getInspirationImages:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInspirationImages:', error);
    return [];
  }
}

export async function getInspirationImage(id: number, userId?: number): Promise<InspirationImage | undefined> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    // With RLS enabled, we don't need to filter by userId in the query
    const { data, error } = await supabase
      .from('inspiration_images')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error in getInspirationImage:', error);
      return undefined;
    }

    return data || undefined;
  } catch (error) {
    console.error('Error in getInspirationImage:', error);
    return undefined;
  }
}

export async function createInspirationImage(image: InsertInspirationImage): Promise<InspirationImage> {
  try {
    // Set the user ID for RLS
    await setRequestUserId(image.userId);

    const { data, error } = await supabase
      .from('inspiration_images')
      .insert([{
        imageUrl: image.imageUrl,
        userId: image.userId,
        styleTags: Array.isArray(image.styleTags) ? image.styleTags : [],
        isSaved: image.isSaved !== undefined ? image.isSaved : false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error in createInspirationImage:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createInspirationImage:', error);
    throw error;
  }
}

export async function updateInspirationImageTags(id: number, tags: string[], userId?: number): Promise<InspirationImage | undefined> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    const { data, error } = await supabase
      .from('inspiration_images')
      .update({ styleTags: tags })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error in updateInspirationImageTags:', error);
      return undefined;
    }

    return data || undefined;
  } catch (error) {
    console.error('Error in updateInspirationImageTags:', error);
    return undefined;
  }
}

export async function updateInspirationImageSaved(id: number, isSaved: boolean, userId?: number): Promise<InspirationImage | undefined> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    const { data, error } = await supabase
      .from('inspiration_images')
      .update({ isSaved })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error in updateInspirationImageSaved:', error);
      return undefined;
    }

    return data || undefined;
  } catch (error) {
    console.error('Error in updateInspirationImageSaved:', error);
    return undefined;
  }
}

export async function deleteInspirationImage(id: number, userId?: number): Promise<boolean> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    const { error } = await supabase
      .from('inspiration_images')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error in deleteInspirationImage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteInspirationImage:', error);
    return false;
  }
}

// Clothing item operations
export async function getClothingItems(userId?: number): Promise<ClothingItem[]> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    // With RLS enabled, we don't need to filter by userId in the query
    const { data, error } = await supabase
      .from('clothing_items')
      .select('*')
      .order('createdAt');

    if (error) {
      console.error('Error in getClothingItems:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClothingItems:', error);
    return [];
  }
}

export async function getClothingItemsByCategory(category: string, userId?: number): Promise<ClothingItem[]> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    // With RLS enabled, we don't need to filter by userId in the query
    const { data, error } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('category', category)
      .order('createdAt');

    if (error) {
      console.error('Error in getClothingItemsByCategory:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClothingItemsByCategory:', error);
    return [];
  }
}

export async function getClothingItem(id: number, userId?: number): Promise<ClothingItem | undefined> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    // With RLS enabled, we don't need to filter by userId in the query
    const { data, error } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error in getClothingItem:', error);
      return undefined;
    }

    return data || undefined;
  } catch (error) {
    console.error('Error in getClothingItem:', error);
    return undefined;
  }
}

export async function createClothingItem(item: InsertClothingItem): Promise<ClothingItem> {
  try {
    // Set the user ID for RLS
    await setRequestUserId(item.userId);

    const { data, error } = await supabase
      .from('clothing_items')
      .insert([{
        imageUrl: item.imageUrl,
        category: item.category || "other",
        userId: item.userId,
        styleTags: Array.isArray(item.styleTags) ? item.styleTags : []
      }])
      .select()
      .single();

    if (error) {
      console.error('Error in createClothingItem:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createClothingItem:', error);
    throw error;
  }
}

export async function updateClothingItemTags(id: number, tags: string[], userId?: number): Promise<ClothingItem | undefined> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    const { data, error } = await supabase
      .from('clothing_items')
      .update({ styleTags: tags })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error in updateClothingItemTags:', error);
      return undefined;
    }

    return data || undefined;
  } catch (error) {
    console.error('Error in updateClothingItemTags:', error);
    return undefined;
  }
}

export async function deleteClothingItem(id: number, userId?: number): Promise<boolean> {
  try {
    // Set the user ID for RLS if provided
    if (userId !== undefined) {
      await setRequestUserId(userId);
    }

    const { error } = await supabase
      .from('clothing_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error in deleteClothingItem:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteClothingItem:', error);
    return false;
  }
}

// Email signup operations
export async function createEmailSignup(email: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('waitlist_signups')
      .insert([{ email }])
      .select()
      .single();

    if (error) {
      console.error('Error in createEmailSignup:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createEmailSignup:', error);
    throw error;
  }
}

export async function getEmailSignups(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('waitlist_signups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error in getEmailSignups:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getEmailSignups:', error);
    return [];
  }
}

// Test database connection
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase connection error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Supabase connection error:', err);
    return false;
  }
}