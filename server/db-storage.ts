import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { User, InsertUser, InspirationImage, InsertInspirationImage, ClothingItem, InsertClothingItem } from '@shared/schema';
import { IStorage } from './storage';
import * as db from './db';
import pg from 'pg';

const { Pool } = pg;

/**
 * PostgreSQL implementation of the storage interface
 */
export class PostgresStorage implements IStorage {
  public sessionStore: session.Store = new session.MemoryStore(); // Default to memory store until initialized
  private pool: pg.Pool;

  constructor() {
    // Use optimized connection pool settings for better reliability and performance
    this.pool = new Pool({
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

    // Add event handlers for connection issues
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error on idle client:', err);
      // Don't crash the server on connection errors, just log them
    });

    // Create the session store with retry handling
    this.initSessionStore();

    // Initialize database tables with retry logic
    this.initializeDatabaseWithRetry();
  }

  // Session store initialization with improved retry and error handling
  private initSessionStore() {
    try {
      const PgStore = pgSession(session);

      // Create session store using our shared PostgreSQL connection with optimized settings
      this.sessionStore = new PgStore({
        pool: this.pool,
        tableName: 'session', // Using standard table name
        schemaName: 'public', // Explicit schema name to avoid issues
        createTableIfMissing: true, // Auto-create table if needed
        pruneSessionInterval: 60 * 60 * 24, // Clean expired sessions once a day (24 hours)
        // Set session expiration to 60 days to match cookie maxAge
        ttl: 60 * 60 * 24 * 60, // 60 days in seconds
        disableTouch: false, // Make sure sessions are updated on activity
        errorLog: (error: any) => {
          console.error('Session store error:', error);
          // Don't crash the server on session store errors
        },
        // Additional options for better persistence
        conString: process.env.DATABASE_URL // Fallback connection string if pool fails
      } as any); // Type assertion to allow custom options

      // Test session store connectivity immediately
      this.testSessionStore();

      // Set up event handlers for session store
      const store = this.sessionStore as any;
      if (store.on) {
        store.on('error', (error: any) => {
          console.error('PostgreSQL session store error:', error);
          // Log but don't crash
        });

        store.on('connect', () => {
        });
      }
    } catch (error) {
      console.error('Failed to initialize session store, using memory store fallback:', error);
      // Fallback to a memory store if PostgreSQL session store fails
      const MemoryStore = session.MemoryStore;
      this.sessionStore = new MemoryStore();
    }
  }

  // Test the session store by storing and retrieving a test session
  private async testSessionStore() {
    try {
      const store: any = this.sessionStore;
      if (!store.get || !store.set) {
        return;
      }

      const testSessionId = `test-session-${Date.now()}`;
      const testSession = {
        cookie: {
          originalMaxAge: 86400000,
          expires: new Date(Date.now() + 86400000),
          secure: false,
          httpOnly: true,
          path: '/',
          sameSite: 'lax'
        },
        test: true,
        created: new Date().toISOString()
      };

      // Store test session and retrieve it
      await new Promise<void>((resolve, reject) => {
        store.set(testSessionId, testSession, (err: Error) => {
          if (err) {
            console.error('Failed to set test session:', err);
            reject(err);
            return;
          }

          store.get(testSessionId, (err: Error, sess: any) => {
            if (err) {
              console.error('Failed to get test session:', err);
              reject(err);
              return;
            }

            if (!sess) {
              console.error('Test session could not be retrieved');
              reject(new Error('Test session not found'));
              return;
            }

            // Clean up the test session
            store.destroy(testSessionId, (err: Error) => {
              if (err) {
                console.warn('Failed to destroy test session:', err);
                // Not a critical error, continue anyway
              }
              resolve();
            });
          });
        });
      });
    } catch (error) {
      console.error('Session store test failed:', error);
      throw error;
    }
  }

  // Initialize database with retries
  private async initializeDatabaseWithRetry() {
    const maxRetries = 5; // Increased max retries for better reliability
    let retryCount = 0;
    let lastError: any = null;

    // Helper function for exponential backoff with jitter
    const calculateBackoff = (retry: number) => {
      const baseWait = Math.min(30000, Math.pow(2, retry) * 1000); // Cap at 30 seconds
      const jitter = Math.random() * baseWait * 0.2; // Add up to 20% jitter
      return baseWait + jitter;
    };

    // Track start time for overall timeout reporting
    const startTime = Date.now();

    while (retryCount < maxRetries) {
      try {
        // Before initializing, check if we can connect to the database
        await this.testDatabaseConnection();

        // If connection is successful, initialize tables
        await db.initDatabase();

        // Verify session table is working properly
        await this.verifySessionTable();

        return;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || 'Unknown error';

        console.error(`Database initialization attempt ${retryCount + 1} failed:`, errorMessage);

        // Calculate wait time with exponential backoff and jitter
        const waitTime = calculateBackoff(retryCount);
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

        await new Promise(resolve => setTimeout(resolve, waitTime));

        retryCount++;
      }
    }

    // If all retries failed
    const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`All database initialization attempts failed after ${totalTimeSeconds}s`);
    throw lastError || new Error('Failed to initialize database after multiple attempts');
  }

  // Test basic database connectivity
  private async testDatabaseConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1 AS connection_test');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw error;
    }
  }

  // Verify that the session table exists and has the expected structure
  private async verifySessionTable(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        // Check if session table exists
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'session'
          );
        `);

        if (!tableExists.rows[0].exists) {
          return;
        }

        // Check if index exists
        const indexExists = await client.query(`
          SELECT COUNT(*) as index_count
          FROM pg_indexes
          WHERE tablename = 'session' AND indexname = 'IDX_session_expire';
        `);

        if (indexExists.rows[0].index_count === 0) {
          await client.query(`
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
          `);
        }

        // Report on session count
        const sessionCount = await client.query('SELECT COUNT(*) FROM session');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Session table verification failed:', error);
      throw error;
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.getUser(id);

    if (user) {
      // Don't return the password hash
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }

    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.getUserByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.getUserByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const createdUser = await db.createUser(user);

    if (createdUser) {
      // Don't return the password hash
      const { password, ...userWithoutPassword } = createdUser;
      return userWithoutPassword as User;
    }

    return createdUser;
  }

  // Inspiration image methods
  async getInspirationImages(userId?: number): Promise<InspirationImage[]> {
    return db.getInspirationImages(userId);
  }

  async getInspirationImage(id: number, userId?: number): Promise<InspirationImage | undefined> {
    return db.getInspirationImage(id, userId);
  }

  async createInspirationImage(image: InsertInspirationImage): Promise<InspirationImage> {
    return db.createInspirationImage(image);
  }

  async updateInspirationImageTags(id: number, tags: string[]): Promise<InspirationImage | undefined> {
    return db.updateInspirationImageTags(id, tags);
  }

  async updateInspirationImageSaved(id: number, isSaved: boolean): Promise<InspirationImage | undefined> {
    return db.updateInspirationImageSaved(id, isSaved);
  }

  async deleteInspirationImage(id: number): Promise<boolean> {
    return db.deleteInspirationImage(id);
  }

  // Clothing item methods
  async getClothingItems(userId?: number): Promise<ClothingItem[]> {
    return db.getClothingItems(userId);
  }

  async getClothingItemsByCategory(category: string, userId?: number): Promise<ClothingItem[]> {
    return db.getClothingItemsByCategory(category, userId);
  }

  async getClothingItem(id: number, userId?: number): Promise<ClothingItem | undefined> {
    return db.getClothingItem(id, userId);
  }

  async createClothingItem(item: InsertClothingItem): Promise<ClothingItem> {
    return db.createClothingItem(item);
  }

  async updateClothingItemTags(id: number, tags: string[]): Promise<ClothingItem | undefined> {
    return db.updateClothingItemTags(id, tags);
  }

  async deleteClothingItem(id: number): Promise<boolean> {
    return db.deleteClothingItem(id);
  }
}