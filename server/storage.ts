import {
  users, type User, type InsertUser,
  inspirationImages, type InspirationImage, type InsertInspirationImage,
  clothingItems, type ClothingItem, type InsertClothingItem,
  emailSignups, type EmailSignup
} from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import * as db from './db';

// Create PostgreSQL session store
const PgSession = connectPgSimple(session);

// Interface for storage operations
export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Inspiration image methods
  getInspirationImages(userId?: number): Promise<InspirationImage[]>;
  getInspirationImage(id: number, userId?: number): Promise<InspirationImage | undefined>;
  createInspirationImage(image: InsertInspirationImage): Promise<InspirationImage>;
  updateInspirationImageTags(id: number, tags: string[], userId?: number): Promise<InspirationImage | undefined>;
  updateInspirationImageSaved(id: number, isSaved: boolean, userId?: number): Promise<InspirationImage | undefined>;
  deleteInspirationImage(id: number, userId?: number): Promise<boolean>;

  // Clothing item methods
  getClothingItems(userId?: number): Promise<ClothingItem[]>;
  getClothingItemsByCategory(category: string, userId?: number): Promise<ClothingItem[]>;
  getClothingItem(id: number, userId?: number): Promise<ClothingItem | undefined>;
  createClothingItem(item: InsertClothingItem): Promise<ClothingItem>;
  updateClothingItemTags(id: number, tags: string[], userId?: number): Promise<ClothingItem | undefined>;
  deleteClothingItem(id: number, userId?: number): Promise<boolean>;

  // Email signup methods
  createEmailSignup(email: string): Promise<EmailSignup>;
  getEmailSignups(): Promise<EmailSignup[]>;
}

// PostgreSQL storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Create PostgreSQL session store using the pool from db.ts
    this.sessionStore = new PgSession({
      pool: db.pool,
      tableName: 'session',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return await db.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await db.getUserByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await db.getUserByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    return await db.createUser(user);
  }

  // Inspiration image methods
  async getInspirationImages(userId?: number): Promise<InspirationImage[]> {
    return await db.getInspirationImages(userId);
  }

  async getInspirationImage(id: number, userId?: number): Promise<InspirationImage | undefined> {
    return await db.getInspirationImage(id, userId);
  }

  async createInspirationImage(image: InsertInspirationImage): Promise<InspirationImage> {
    return await db.createInspirationImage(image);
  }

  async updateInspirationImageTags(id: number, tags: string[], userId?: number): Promise<InspirationImage | undefined> {
    return await db.updateInspirationImageTags(id, tags, userId);
  }

  async updateInspirationImageSaved(id: number, isSaved: boolean, userId?: number): Promise<InspirationImage | undefined> {
    return await db.updateInspirationImageSaved(id, isSaved, userId);
  }

  async deleteInspirationImage(id: number, userId?: number): Promise<boolean> {
    return await db.deleteInspirationImage(id, userId);
  }

  // Clothing item methods
  async getClothingItems(userId?: number): Promise<ClothingItem[]> {
    return await db.getClothingItems(userId);
  }

  async getClothingItemsByCategory(category: string, userId?: number): Promise<ClothingItem[]> {
    return await db.getClothingItemsByCategory(category, userId);
  }

  async getClothingItem(id: number, userId?: number): Promise<ClothingItem | undefined> {
    return await db.getClothingItem(id, userId);
  }

  async createClothingItem(item: InsertClothingItem): Promise<ClothingItem> {
    return await db.createClothingItem(item);
  }

  async updateClothingItemTags(id: number, tags: string[], userId?: number): Promise<ClothingItem | undefined> {
    return await db.updateClothingItemTags(id, tags, userId);
  }

  async deleteClothingItem(id: number, userId?: number): Promise<boolean> {
    return await db.deleteClothingItem(id, userId);
  }

  // Email signup methods
  async createEmailSignup(email: string): Promise<EmailSignup> {
    return await db.createEmailSignup(email);
  }

  async getEmailSignups(): Promise<EmailSignup[]> {
    return await db.getEmailSignups();
  }
}

// Export singleton storage instance
export const storage: IStorage = new DatabaseStorage();
