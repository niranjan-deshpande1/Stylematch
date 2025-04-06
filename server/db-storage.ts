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

  // Session store initialization with better retry and error handling
  private initSessionStore() {
    try {
      const PgStore = pgSession(session);

      // Create session store using our shared PostgreSQL connection with optimized settings
      this.sessionStore = new PgStore({
        pool: this.pool,
        tableName: 'session', // Using standard table name
        schemaName: 'public', // Explicit schema name to avoid issues
        createTableIfMissing: true, // Auto-create table if needed
        pruneSessionInterval: 60 * 30, // Clean expired sessions every 30 minutes
        errorLog: (error) => {
          console.error('Session store error:', error);
          // Don't crash the server on session store errors
        }
      });
    } catch (error) {
      console.error('Failed to initialize session store, using memory store fallback:', error);
      // Fallback to a memory store if PostgreSQL session store fails
      const MemoryStore = session.MemoryStore;
      this.sessionStore = new MemoryStore();
    }
  }

  // Initialize database with retry mechanism
  private async initializeDatabaseWithRetry() {
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        await db.initDatabase();
        return;
      } catch (error) {
        lastError = error;
        console.error(`Database initialization attempt ${retryCount + 1} failed:`, error);

        // Exponential backoff - wait longer between each retry
        const waitTime = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));

        retryCount++;
      }
    }

    // If all retries failed
    console.error('All database initialization attempts failed');
    throw lastError;
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