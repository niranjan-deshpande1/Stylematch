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
  public sessionStore: session.Store;
  private pool: pg.Pool;

  constructor() {
    // Use the same connection pool settings as in db.ts
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Necessary for some PostgreSQL providers like Neon
      },
      max: 10, // maximum number of clients in the pool (reduced to avoid connection limits)
      idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 10000, // increased to 10 seconds to avoid timeout issues
      keepAlive: true, // Add keep-alive to prevent connection drops
    });

    const PgStore = pgSession(session);
    // Create session store using our shared PostgreSQL connection
    this.sessionStore = new PgStore({
      // Use existing connection pool for session store
      pool: this.pool,
      tableName: 'session', // Use a custom table name
      createTableIfMissing: true, // Create the table if it doesn't exist
      pruneSessionInterval: 60 * 10, // Cleanup expired sessions every 10 minutes
      conString: process.env.DATABASE_URL // Ensure we use the same connection string
    });

    // Initialize DB tables
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    // Added retry logic for database initialization
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        await db.initDatabase();
        return; // Success - exit the method
      } catch (error) {
        lastError = error;
        console.error(`Database initialization attempt ${retryCount + 1} failed:`, error);

        // Exponential backoff - wait longer between each retry
        const waitTime = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));

        retryCount++;
      }
    }

    // If we get here, all retries failed
    console.error("All database initialization attempts failed");
    throw lastError;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.getUser(id);

    // Don't return the password
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }

    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // This function is used for authentication, so we need to return the full user object
    // including the password hash for verification
    return db.getUserByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // This function is used for authentication, so we need to return the full user object
    // including the password hash for verification
    return db.getUserByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const createdUser = await db.createUser(user);

    // Don't return the password
    if (createdUser) {
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