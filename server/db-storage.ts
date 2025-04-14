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

    // Initialize session store asynchronously with a self-executing async function
    (async () => {
      try {
        await this.initSessionStore();
      } catch (err) {
        console.error('Error initializing session store:', err);
        // We're already using memory store as fallback, so no need to create another one
      }
    })();

    // Initialize database tables with retry logic asynchronously
    (async () => {
      try {
        await this.initializeDatabaseWithRetry();
      } catch (err) {
        console.error('Error initializing database:', err);
      }
    })();
  }

  // set up the postgres session store
  private async initSessionStore() {
    try {
      const PgStore = pgSession(session);

      // Create a more resilient session store for better cross-deployment persistence

      // First ensure the session table exists with proper structure
      try {
        await this.ensureSessionTable();
      } catch (err) {
        console.error('Session table verification failed:', err);
      }

      // Create session store using our shared PostgreSQL connection with optimized settings
      // First, ensure all sessions in the database are valid
      try {
        const client = await this.pool.connect();
        try {
          // Check and fix any problematic sessions
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = 'session'
            );
          `);

          if (result.rows[0].exists) {
            // Delete any corrupted session data
            await client.query(`
              DELETE FROM session
              WHERE sess IS NULL
              OR sess::text = '{}'::text
              OR sess::text = 'null'::text
              OR expire < NOW();
            `);
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error cleaning up sessions:', error);
        // Continue anyway
      }

      // create the session store
      this.sessionStore = new PgStore({
        pool: this.pool,
        tableName: 'session',
        schemaName: 'public',
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 60, // Clean expired sessions every hour for better performance
        // Set session expiration to 60 days to match cookie maxAge
        ttl: 60 * 60 * 24 * 60, // 60 days in seconds
        disableTouch: false, // Make sure sessions are updated on activity
        // Give the store 5 seconds to respond before timing out
        operationTimeout: 5000,
        // Retry 3 times before giving up on database operations
        retries: 3,
        // Log errors but don't crash
        errorLog: (error: any) => {
          console.error('Session store error:', error);
        },
        // Use a consistent table structure with proper index
        createTableSql: `
          CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL
          );
          CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `,
        // Additional options for better persistence
        conString: process.env.DATABASE_URL // Fallback connection string if pool fails
      } as any); // Type assertion to allow custom options

      // Add resilience with periodic session store checks
      this.setupSessionStoreHealthChecks();

      // Set up event handlers for session store
      const store = this.sessionStore as any;
      if (store.on) {
        // When an error occurs
        store.on('error', (error: any) => {
          console.error('PostgreSQL session store error:', error);

          // Try to recover by recreating the session store after a delay
          setTimeout(() => {
            this.recoverSessionStore();
          }, 5000);
        });

        // When connection is established
        store.on('connect', () => {
        });
      }

      // Test session store connectivity immediately
      this.testSessionStore()
        .catch(err => {
          console.error('Initial session store test failed:', err);
          this.recoverSessionStore();
        });
    } catch (error) {
      console.error('Failed to initialize session store, using memory store fallback:', error);
      // Fallback to a memory store if PostgreSQL session store fails
      const MemoryStore = session.MemoryStore;
      this.sessionStore = new MemoryStore();

      // Try to recover the PostgreSQL session store after a delay
      setTimeout(() => {
        this.recoverSessionStore();
      }, 30000); // Try again after 30 seconds
    }
  }

  // Setup periodic health checks for the session store
  private setupSessionStoreHealthChecks() {
    // Check session store health every 15 minutes
    const healthCheckInterval = 15 * 60 * 1000;

    setInterval(() => {
      this.testSessionStore()
        .catch(err => {
          console.error('Session store health check failed:', err);
          this.recoverSessionStore();
        });
    }, healthCheckInterval);
  }

  // Attempt to recover the session store if it fails
  private async recoverSessionStore() {
    try {
      // Ensure the session table exists with proper structure
      await this.ensureSessionTable();

      // Recreate the session store
      const PgStore = pgSession(session);
      this.sessionStore = new PgStore({
        pool: this.pool,
        tableName: 'session',
        schemaName: 'public',
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 60 * 2, // Every 2 hours
        ttl: 60 * 60 * 24 * 60, // 60 days in seconds
        disableTouch: false,
        errorLog: (error: any) => {
          console.error('Session store error during recovery:', error);
        },
        conString: process.env.DATABASE_URL
      } as any);

      // Test the recovered session store
      await this.testSessionStore();
    } catch (error) {
      console.error('Failed to recover PostgreSQL session store:', error);
    }
  }

  // Ensure the session table exists with the proper structure
  private async ensureSessionTable(): Promise<void> {
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
          // Create the session table with optimized structure
          await client.query(`
            CREATE TABLE IF NOT EXISTS "session" (
              "sid" varchar NOT NULL COLLATE "default",
              "sess" json NOT NULL,
              "expire" timestamp(6) NOT NULL,
              CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
            );
          `);

          // Create index for expire column
          await client.query(`
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
          `);

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

        // Check and fix any problematic records
        const invalidRecords = await client.query(`
          SELECT COUNT(*) as invalid_count
          FROM "session"
          WHERE sess IS NULL OR sess::text = '{}'::text OR sess::text = 'null'::text;
        `);

        if (parseInt(invalidRecords.rows[0].invalid_count) > 0) {
          await client.query(`
            DELETE FROM "session"
            WHERE sess IS NULL OR sess::text = '{}'::text OR sess::text = 'null'::text;
          `);
        }

        // Report on session count
        const sessionCount = await client.query('SELECT COUNT(*) FROM session');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Session table verification/creation failed:', error);
      throw error;
    }
  }

  // Test session store with date validation and error checking
  private async testSessionStore() {
    try {
      const store: any = this.sessionStore;
      if (!store.get || !store.set) {
        return;
      }

      // Let's verify all session expirations are valid first
      try {
        const client = await this.pool.connect();
        try {
          // Check for invalid expiration dates in session table
          const invalidSessions = await client.query(`
            SELECT COUNT(*) as invalid_count
            FROM session
            WHERE expire < NOW() - INTERVAL '1 year'
            OR expire > NOW() + INTERVAL '2 years'
          `);

          if (parseInt(invalidSessions.rows[0].invalid_count) > 0) {
            await client.query(`
              DELETE FROM session
              WHERE expire < NOW() - INTERVAL '1 year'
              OR expire > NOW() + INTERVAL '2 years'
            `);
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error checking session expirations:', error);
      }

      // Define a proper test session with valid dates
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 60); // 60 days from now

      const testSessionId = `test-session-${Date.now()}`;
      const testSession = {
        cookie: {
          originalMaxAge: 1000 * 60 * 60 * 24 * 60, // 60 days in milliseconds
          expires: expirationDate,
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