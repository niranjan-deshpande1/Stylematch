import pg from 'pg';
import { User, InsertUser, InspirationImage, InsertInspirationImage, ClothingItem, InsertClothingItem } from '@shared/schema';

const { Pool } = pg;

// Use a connection pool for better performance and reliability
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessary for some PostgreSQL providers like Neon
  },
  max: 10, // maximum number of clients in the pool (reduced to avoid connection limits)
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // increased to 10 seconds to avoid timeout issues
  keepAlive: true, // Add keep-alive to prevent connection drops
});

// Initialize the database on startup
export async function initDatabase() {
  let client;
  try {
    // Acquire a client from the pool with retry logic
    client = await getClientWithRetry();

    // Start a transaction
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);

    // Create inspiration_images table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inspiration_images (
        id SERIAL PRIMARY KEY,
        "imageUrl" TEXT NOT NULL,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        "styleTags" TEXT[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "isSaved" BOOLEAN DEFAULT FALSE
      );
    `);

    // Create clothing_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clothing_items (
        id SERIAL PRIMARY KEY,
        "imageUrl" TEXT NOT NULL,
        category TEXT NOT NULL,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        "styleTags" TEXT[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create session table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    // Commit the transaction
    await client.query('COMMIT');
  } catch (error) {
    // If any query fails, roll back the transaction
    if (client) {
      await client.query('ROLLBACK').catch(e => console.error('Error during rollback:', e));
    }
    console.error('Error initializing database:', error);
    throw error; // Propagate the error for higher-level handling
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
}

// Helper function to get a client with retry logic
async function getClientWithRetry(maxRetries = 3) {
  let retryCount = 0;
  let lastError;

  while (retryCount < maxRetries) {
    try {
      return await pool.connect();
    } catch (error) {
      lastError = error;
      console.error(`Failed to connect to database (attempt ${retryCount + 1}/${maxRetries}):`, error);

      // Exponential backoff - wait longer between each retry
      const waitTime = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));

      retryCount++;
    }
  }

  throw lastError || new Error('Failed to connect to database after multiple attempts');
}

// User operations
export async function getUser(id: number): Promise<User | undefined> {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in getUser:', error);
    return undefined;
  }
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return undefined;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return undefined;
  }
}

export async function createUser(user: InsertUser): Promise<User> {
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [user.username, user.email, user.password]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

// Inspiration image operations
export async function getInspirationImages(userId?: number): Promise<InspirationImage[]> {
  try {
    let query = 'SELECT * FROM inspiration_images ORDER BY "createdAt"';
    const params: any[] = [];

    if (userId !== undefined) {
      query = 'SELECT * FROM inspiration_images WHERE "userId" = $1 ORDER BY "createdAt"';
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error in getInspirationImages:', error);
    return [];
  }
}

export async function getInspirationImage(id: number, userId?: number): Promise<InspirationImage | undefined> {
  try {
    let query = 'SELECT * FROM inspiration_images WHERE id = $1';
    const params: any[] = [id];

    if (userId !== undefined) {
      query += ' AND "userId" = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  } catch (error) {
    console.error('Error in getInspirationImage:', error);
    return undefined;
  }
}

export async function createInspirationImage(image: InsertInspirationImage): Promise<InspirationImage> {
  try {
    const result = await pool.query(
      'INSERT INTO inspiration_images ("imageUrl", "userId", "styleTags", "createdAt", "isSaved") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        image.imageUrl,
        image.userId,
        Array.isArray(image.styleTags) ? image.styleTags : [],
        new Date(),
        image.isSaved !== undefined ? image.isSaved : false
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in createInspirationImage:', error);
    throw error;
  }
}

export async function updateInspirationImageTags(id: number, tags: string[]): Promise<InspirationImage | undefined> {
  try {
    const result = await pool.query(
      'UPDATE inspiration_images SET "styleTags" = $1 WHERE id = $2 RETURNING *',
      [tags, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateInspirationImageTags:', error);
    return undefined;
  }
}

export async function updateInspirationImageSaved(id: number, isSaved: boolean): Promise<InspirationImage | undefined> {
  try {
    const result = await pool.query(
      'UPDATE inspiration_images SET "isSaved" = $1 WHERE id = $2 RETURNING *',
      [isSaved, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateInspirationImageSaved:', error);
    return undefined;
  }
}

export async function deleteInspirationImage(id: number): Promise<boolean> {
  try {
    const result = await pool.query(
      'DELETE FROM inspiration_images WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error in deleteInspirationImage:', error);
    return false;
  }
}

// Clothing item operations
export async function getClothingItems(userId?: number): Promise<ClothingItem[]> {
  try {
    let query = 'SELECT * FROM clothing_items ORDER BY "createdAt"';
    const params: any[] = [];

    if (userId !== undefined) {
      query = 'SELECT * FROM clothing_items WHERE "userId" = $1 ORDER BY "createdAt"';
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error in getClothingItems:', error);
    return [];
  }
}

export async function getClothingItemsByCategory(category: string, userId?: number): Promise<ClothingItem[]> {
  try {
    let query = 'SELECT * FROM clothing_items WHERE category = $1 ORDER BY "createdAt"';
    const params: any[] = [category];

    if (userId !== undefined) {
      query = 'SELECT * FROM clothing_items WHERE category = $1 AND "userId" = $2 ORDER BY "createdAt"';
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error in getClothingItemsByCategory:', error);
    return [];
  }
}

export async function getClothingItem(id: number, userId?: number): Promise<ClothingItem | undefined> {
  try {
    let query = 'SELECT * FROM clothing_items WHERE id = $1';
    const params: any[] = [id];

    if (userId !== undefined) {
      query += ' AND "userId" = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  } catch (error) {
    console.error('Error in getClothingItem:', error);
    return undefined;
  }
}

export async function createClothingItem(item: InsertClothingItem): Promise<ClothingItem> {
  try {
    const result = await pool.query(
      'INSERT INTO clothing_items ("imageUrl", category, "userId", "styleTags", "createdAt") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        item.imageUrl,
        item.category || "other",
        item.userId,
        Array.isArray(item.styleTags) ? item.styleTags : [],
        new Date()
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in createClothingItem:', error);
    throw error;
  }
}

export async function updateClothingItemTags(id: number, tags: string[]): Promise<ClothingItem | undefined> {
  try {
    const result = await pool.query(
      'UPDATE clothing_items SET "styleTags" = $1 WHERE id = $2 RETURNING *',
      [tags, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in updateClothingItemTags:', error);
    return undefined;
  }
}

export async function deleteClothingItem(id: number): Promise<boolean> {
  try {
    const result = await pool.query(
      'DELETE FROM clothing_items WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error in deleteClothingItem:', error);
    return false;
  }
}

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
}