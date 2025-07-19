import {
  users, type User, type InsertUser,
  inspirationImages, type InspirationImage, type InsertInspirationImage,
  clothingItems, type ClothingItem, type InsertClothingItem,
  emailSignups, type EmailSignup, type InsertEmailSignup
} from "@shared/schema";
import session from "express-session";
import memorystore from "memorystore";

// Import PostgreSQL storage implementation
import { PostgresStorage } from './db-storage';

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
  updateInspirationImageTags(id: number, tags: string[]): Promise<InspirationImage | undefined>;
  updateInspirationImageSaved(id: number, isSaved: boolean): Promise<InspirationImage | undefined>;
  deleteInspirationImage(id: number): Promise<boolean>;

  // Clothing item methods
  getClothingItems(userId?: number): Promise<ClothingItem[]>;
  getClothingItemsByCategory(category: string, userId?: number): Promise<ClothingItem[]>;
  getClothingItem(id: number, userId?: number): Promise<ClothingItem | undefined>;
  createClothingItem(item: InsertClothingItem): Promise<ClothingItem>;
  updateClothingItemTags(id: number, tags: string[]): Promise<ClothingItem | undefined>;
  deleteClothingItem(id: number): Promise<boolean>;

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

// We will use PostgreSQL storage for persistence, or fallback to memory storage
// This handles both privacy and cross-device compatibility concerns
let storageImplementation: IStorage;

try {
  // Check if we have a valid DATABASE_URL environment variable
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Using memory storage instead.');
  }

  // Try to use PostgreSQL storage first
  storageImplementation = new PostgresStorage();
} catch (error) {
  // Fallback to memory storage if PostgreSQL fails
  console.warn('Failed to initialize PostgreSQL storage, falling back to memory storage:', error);
  storageImplementation = new MemStorage();

  // Print warning to make it clear we're using in-memory storage
  console.warn('USING IN-MEMORY STORAGE - DATA WILL BE LOST ON RESTART');
  console.warn('To fix this issue, please set up a valid PostgreSQL database.');
}

export const storage = storageImplementation;
