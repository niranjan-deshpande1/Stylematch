import {
  users, type User, type InsertUser,
  inspirationImages, type InspirationImage, type InsertInspirationImage,
  clothingItems, type ClothingItem, type InsertClothingItem,
  emailSignups, type EmailSignup, type InsertEmailSignup
} from "@shared/schema";
import session from "express-session";
import memorystore from "memorystore";

// Import Supabase storage implementation
import * as db from './db';

// Create a more reliable memory-based session store
// This is better than the default MemoryStore for production
const MemoryStore = memorystore(session);

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

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private inspirationImages: Map<number, InspirationImage>;
  private clothingItems: Map<number, ClothingItem>;
  private userCurrentId: number;
  private inspirationImageCurrentId: number;
  private clothingItemCurrentId: number;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.inspirationImages = new Map();
    this.clothingItems = new Map();
    this.userCurrentId = 1;
    this.inspirationImageCurrentId = 1;
    this.clothingItemCurrentId = 1;

    // Create an memory store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Inspiration image methods
  async getInspirationImages(userId?: number): Promise<InspirationImage[]> {
    let images = Array.from(this.inspirationImages.values());

    // Filter by user ID if specified
    if (userId !== undefined) {
      images = images.filter(image => image.userId === userId);
    }

    return images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getInspirationImage(id: number, userId?: number): Promise<InspirationImage | undefined> {
    const image = this.inspirationImages.get(id);

    // If userId is provided, check if the image belongs to that user
    if (image && userId !== undefined && image.userId !== userId) {
      return undefined; // Return undefined if image doesn't belong to the user
    }

    return image;
  }

  async createInspirationImage(image: InsertInspirationImage): Promise<InspirationImage> {
    const id = this.inspirationImageCurrentId++;
    const newImage: InspirationImage = {
      ...image,
      id,
      styleTags: [],
      createdAt: new Date(),
      userId: image.userId,
      isSaved: image.isSaved || false
    };
    this.inspirationImages.set(id, newImage);
    return newImage;
  }

  async updateInspirationImageTags(id: number, tags: string[]): Promise<InspirationImage | undefined> {
    const image = this.inspirationImages.get(id);
    if (!image) return undefined;

    const updatedImage = { ...image, styleTags: tags };
    this.inspirationImages.set(id, updatedImage);
    return updatedImage;
  }

  async updateInspirationImageSaved(id: number, isSaved: boolean): Promise<InspirationImage | undefined> {
    const image = this.inspirationImages.get(id);
    if (!image) return undefined;

    const updatedImage = { ...image, isSaved };
    this.inspirationImages.set(id, updatedImage);
    return updatedImage;
  }

  async deleteInspirationImage(id: number): Promise<boolean> {
    return this.inspirationImages.delete(id);
  }

  // Clothing item methods
  async getClothingItems(userId?: number): Promise<ClothingItem[]> {
    let items = Array.from(this.clothingItems.values());

    // Filter by user ID if specified
    if (userId !== undefined) {
      items = items.filter(item => item.userId === userId);
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getClothingItemsByCategory(category: string, userId?: number): Promise<ClothingItem[]> {
    let items = Array.from(this.clothingItems.values())
      .filter(item => item.category === category);

    // Filter by user ID if specified
    if (userId !== undefined) {
      items = items.filter(item => item.userId === userId);
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getClothingItem(id: number, userId?: number): Promise<ClothingItem | undefined> {
    const item = this.clothingItems.get(id);

    // If userId is provided, check if the item belongs to that user
    if (item && userId !== undefined && item.userId !== userId) {
      return undefined; // Return undefined if item doesn't belong to the user
    }

    return item;
  }

  async createClothingItem(item: InsertClothingItem): Promise<ClothingItem> {
    const id = this.clothingItemCurrentId++;
    const newItem: ClothingItem = {
      ...item,
      id,
      styleTags: [],
      createdAt: new Date(),
      userId: item.userId,
      category: item.category || "other"
    };
    this.clothingItems.set(id, newItem);
    return newItem;
  }

  async updateClothingItemTags(id: number, tags: string[]): Promise<ClothingItem | undefined> {
    const item = this.clothingItems.get(id);
    if (!item) return undefined;

    const updatedItem = { ...item, styleTags: tags };
    this.clothingItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteClothingItem(id: number): Promise<boolean> {
    return this.clothingItems.delete(id);
  }

  async createEmailSignup(email: string): Promise<EmailSignup> {
    // For MemStorage, just store in memory (not persistent)
    const signup: EmailSignup = {
      id: Date.now(),
      email,
      createdAt: new Date()
    };
    return signup;
  }

  async getEmailSignups(): Promise<EmailSignup[]> {
    // For MemStorage, return empty array
    return [];
  }
}

// Supabase storage implementation using the functions from db.ts
export class SupabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Create an memory store for sessions (can be migrated to Supabase later)
    const MemoryStore = memorystore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
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

// We will use Supabase storage for persistence, or fallback to memory storage
let storageImplementation: IStorage;

try {
  // Check if we have valid Supabase environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not set. Using memory storage instead.');
  }

  // Try to use Supabase storage first
  storageImplementation = new SupabaseStorage();
} catch (error) {
  // Fallback to memory storage if Supabase fails
  console.warn('Failed to initialize Supabase storage, falling back to memory storage:', error);
  storageImplementation = new MemStorage();

  // Print warning to make it clear we're using in-memory storage
  console.warn('USING IN-MEMORY STORAGE - DATA WILL BE LOST ON RESTART');
  console.warn('To fix this issue, please set up valid Supabase credentials.');
}

export const storage = storageImplementation;
