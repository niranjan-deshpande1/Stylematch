import { 
  users, type User, type InsertUser,
  inspirationImages, type InspirationImage, type InsertInspirationImage,
  clothingItems, type ClothingItem, type InsertClothingItem
} from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
const { Pool } = pg;

// Create a PostgreSQL pool for session storage
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create PostgreSQL session store
const PostgresSessionStore = connectPgSimple(session);

// Interface for storage operations
export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  findOrCreateGoogleUser(profile: any): Promise<User>;

  // Inspiration image methods
  getInspirationImages(): Promise<InspirationImage[]>;
  getInspirationImage(id: number): Promise<InspirationImage | undefined>;
  createInspirationImage(image: InsertInspirationImage): Promise<InspirationImage>;
  updateInspirationImageTags(id: number, tags: string[]): Promise<InspirationImage | undefined>;
  updateInspirationImageSaved(id: number, isSaved: boolean): Promise<InspirationImage | undefined>;
  deleteInspirationImage(id: number): Promise<boolean>;
  
  // Clothing item methods
  getClothingItems(): Promise<ClothingItem[]>;
  getClothingItemsByCategory(category: string): Promise<ClothingItem[]>;
  getClothingItem(id: number): Promise<ClothingItem | undefined>;
  createClothingItem(item: InsertClothingItem): Promise<ClothingItem>;
  updateClothingItemTags(id: number, tags: string[]): Promise<ClothingItem | undefined>;
  deleteClothingItem(id: number): Promise<boolean>;
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
    
    // Create the PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async findOrCreateGoogleUser(profile: any): Promise<User> {
    // Look for an existing user with this Google ID as username
    const googleId = profile.id;
    const existingUser = await this.getUserByUsername(googleId);
    
    if (existingUser) {
      return existingUser;
    }
    
    // Create a new user
    const newUser: InsertUser = {
      username: googleId,
      // Use a random password for Google users since we won't be using it
      password: `google_${Math.random().toString(36).substring(2)}`,
    };
    
    return this.createUser(newUser);
  }

  // Inspiration image methods
  async getInspirationImages(): Promise<InspirationImage[]> {
    return Array.from(this.inspirationImages.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getInspirationImage(id: number): Promise<InspirationImage | undefined> {
    return this.inspirationImages.get(id);
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
  async getClothingItems(): Promise<ClothingItem[]> {
    return Array.from(this.clothingItems.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getClothingItemsByCategory(category: string): Promise<ClothingItem[]> {
    return Array.from(this.clothingItems.values())
      .filter(item => item.category === category)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getClothingItem(id: number): Promise<ClothingItem | undefined> {
    return this.clothingItems.get(id);
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
}

export const storage = new MemStorage();
