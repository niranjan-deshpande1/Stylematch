import pg from 'pg';
import { User, InsertUser, InspirationImage, InsertInspirationImage, ClothingItem, InsertClothingItem } from '@shared/schema';

const { Pool } = pg;

// Use a connection pool with optimized settings for better reliability and performance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessary for some PostgreSQL providers like Neon
  },
  max: 5, // Reduced maximum clients to avoid hitting connection limits
  min: 1, // Ensure at least one connection is always ready
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 15000, // Increased to 15 seconds to avoid timeout issues
  keepAlive: true, // Enable keep-alive to prevent connection drops
  allowExitOnIdle: false, // Don't allow the app to exit while idle connections exist
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

// Helper function to get a client with retries
async function getClientWithRetry(maxRetries = 10) { // Increased max retries for better reliability
  let retryCount = 0;
  let lastError;

  // Add jitter to backoff calculation to prevent thundering herd
  const calculateBackoff = (retry: number) => {
    const base = Math.min(30000, Math.pow(2, retry) * 1000); // Exponential backoff base, max 30 seconds
    const jitter = Math.random() * base * 0.2; // Random jitter up to 20% of base
    return base + jitter;
  };

  while (retryCount < maxRetries) {
    try {
      // Acquire a client with timeout
      const connectPromise = pool.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 20000); // Increased timeout to 20 seconds
      });

      // Use Promise.race to implement a timeout
      const client = await Promise.race([connectPromise, timeoutPromise]) as pg.PoolClient;

      // Test the connection with a simple query
      await client.query('SELECT 1 AS connection_test');

      // Return the working client
      return client;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || 'Unknown error';
      const errorCode = error.code || 'NO_CODE';

      console.error(`Failed to connect to database (attempt ${retryCount + 1}/${maxRetries})`);
      console.error(`Error code: ${errorCode}, Message: ${errorMessage}`);

      // Exponential backoff with jitter
      const waitTime = calculateBackoff(retryCount);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      retryCount++;
    }
  }

  console.error(`Database connection failed after ${maxRetries} attempts`);
  console.error(`Last error: ${lastError?.message || 'Unknown error'}`);
  throw lastError || new Error('Failed to connect to database after multiple attempts');
}

// Wrapper function for database operations with retry logic
async function withDatabaseRetry<T>(
  operation: string,
  queryFn: () => Promise<T>,
  maxRetries = 5 // Increased max retries
): Promise<T> {
  let retryCount = 0;
  let lastError: any;

  // Helper function for exponential backoff with jitter
  const calculateBackoff = (retry: number) => {
    const baseWait = Math.min(20000, Math.pow(2, retry) * 1000); // Cap at 20 seconds
    const jitter = Math.random() * baseWait * 0.2; // Add up to 20% jitter
    return baseWait + jitter;
  };

  // Track start time for overall timeout reporting
  const startTime = Date.now();

  while (retryCount < maxRetries) {
    try {
      // Attempt the database operation
      return await queryFn();
    } catch (error: any) {
      // Don't retry if the error is a constraint violation or other non-connection error
      if (error.code && (
          error.code.startsWith('23') || // Integrity constraint violation
          error.code.startsWith('22') || // Data exception
          error.code.startsWith('42')    // Syntax error or access rule violation
        )) {
        throw error; // These errors won't be fixed by retrying
      }

      lastError = error;
      const errorMessage = error.message || 'Unknown error';
      const errorCode = error.code || 'NO_CODE';

      console.error(`Database operation "${operation}" failed (attempt ${retryCount + 1}/${maxRetries})`);
      console.error(`Error code: ${errorCode}, Message: ${errorMessage}`);

      // List of connection-related errors to retry
      const isConnectionError = !error.code ||
        error.code === '08000' || // Connection exception
        error.code === '08003' || // Connection does not exist
        error.code === '08006' || // Connection failure
        error.code === '08001' || // SQL client unable to establish SQL connection
        error.code === '08004' || // Server rejected the connection
        error.code === 'XX000' || // Internal error
        error.code === '57P01' || // Admin shutdown
        error.code === '57P02' || // Crash shutdown
        error.code === '57P03' || // Cannot connect now
        error.code === '53300' || // Too many connections
        error.code === '53100' || // Disk full
        error.code === '58030' || // IO error
        error.code === '57014' || // Query canceled
        error.message?.includes('timeout') || // Any timeout message
        error.message?.includes('connection') || // Any connection-related message
        error.message?.includes('network'); // Any network-related message

      if (isConnectionError) {
        // Calculate wait time with exponential backoff and jitter
        const waitTime = calculateBackoff(retryCount);
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

        await new Promise(resolve => setTimeout(resolve, waitTime));

        retryCount++;
        continue;
      }

      // For other errors, don't retry
      throw error;
    }
  }

  // All retries failed
  const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error(`Operation "${operation}" failed after ${maxRetries} attempts (${totalTimeSeconds}s total)`);
  console.error(`Last error: ${lastError?.message || 'Unknown error'}`);

  throw lastError || new Error(`Operation "${operation}" failed after ${maxRetries} attempts`);
}

// User operations
export async function getUser(id: number): Promise<User | undefined> {
  try {
    return await withDatabaseRetry('getUser', async () => {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0];
    });
  } catch (error) {
    console.error('Error in getUser:', error);
    return undefined;
  }
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  try {
    return await withDatabaseRetry('getUserByUsername', async () => {
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      return result.rows[0];
    });
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return undefined;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    return await withDatabaseRetry('getUserByEmail', async () => {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0];
    });
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return undefined;
  }
}

export async function createUser(user: InsertUser): Promise<User> {
  try {
    return await withDatabaseRetry('createUser', async () => {
      const result = await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
        [user.username, user.email, user.password]
      );
      return result.rows[0];
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

// Inspiration image operations
export async function getInspirationImages(userId?: number): Promise<InspirationImage[]> {
  try {
    return await withDatabaseRetry('getInspirationImages', async () => {
      let query = 'SELECT * FROM inspiration_images ORDER BY "createdAt" DESC';
      const params: any[] = [];

      if (userId !== undefined) {
        query = 'SELECT * FROM inspiration_images WHERE "userId" = $1 ORDER BY "createdAt" DESC';
        params.push(userId);
      }

      const result = await pool.query(query, params);
      return result.rows;
    });
  } catch (error) {
    console.error('Error in getInspirationImages:', error);
    // Return empty array instead of throwing error to prevent UI breakage
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