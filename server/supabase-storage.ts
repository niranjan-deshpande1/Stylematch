import session from 'express-session';
import { User, InsertUser, InspirationImage, InsertInspirationImage, ClothingItem, InsertClothingItem, EmailSignup, InsertEmailSignup, UserSwipe, InsertUserSwipe, UserStyleProfile, InsertUserStyleProfile, users, inspirationImages, clothingItems, emailSignups, userSwipes, userStyleProfiles } from '@shared/schema';
import { IStorage } from './storage';
import { supabase } from './supabase-client';
import { eq, and, desc, asc } from 'drizzle-orm';

// Import the Supabase database connection
import { db } from './supabase-client';

/**
 * Supabase implementation of the storage interface
 * Preserves all existing logic while using Supabase as the data layer
 */
export class SupabaseStorage implements IStorage {
  public sessionStore: session.Store = new session.MemoryStore(); // Will be replaced with Supabase session store

  constructor() {
    // Initialize session store with Supabase
    this.initSessionStore();

    // Initialize database tables
    this.initializeDatabase();
  }

  private async initSessionStore() {
    try {
      // sessions stay in memory for now
      // The main benefit is having the data layer unified
    } catch (err) {
      console.error('Error initializing session store:', err);
    }
  }

  private async initializeDatabase() {
    try {
      // Test the connection
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is fine for initial setup
        console.error('Database connection test failed:', error);
      }
    } catch (err) {
      console.error('Error verifying database:', err);
    }
  }

  // User management methods - preserve existing logic
  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const userList = await db.select().from(users).where(eq(users.id, id));
      return userList[0] || undefined;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const userList = await db.select().from(users).where(eq(users.id, id));
      return userList[0] || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const userList = await db.select().from(users).where(eq(users.username, username));
      return userList[0] || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const userList = await db.select().from(users).where(eq(users.email, email));
      return userList[0] || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | null> {
    try {
      const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      return updatedUser || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Inspiration image methods - preserve existing logic
  async createInspirationImage(image: InsertInspirationImage): Promise<InspirationImage> {
    try {
      const [newImage] = await db.insert(inspirationImages).values(image).returning();
      return newImage;
    } catch (error) {
      console.error('Error creating inspiration image:', error);
      throw error;
    }
  }

  async getInspirationImages(userId?: number): Promise<InspirationImage[]> {
    try {
      let query = db.select().from(schema.inspirationImages);
      if (userId !== undefined) {
        query = query.where(eq(schema.inspirationImages.userId, userId));
      }
      return await query.orderBy(asc(schema.inspirationImages.id));
    } catch (error) {
      console.error('Error getting inspiration images:', error);
      throw error;
    }
  }

  async getInspirationImage(id: number, userId?: number): Promise<InspirationImage | undefined> {
    try {
      let query = db.select().from(schema.inspirationImages).where(eq(schema.inspirationImages.id, id));
      if (userId !== undefined) {
        query = query.where(and(eq(schema.inspirationImages.id, id), eq(schema.inspirationImages.userId, userId)));
      }
      const images = await query;
      return images[0] || undefined;
    } catch (error) {
      console.error('Error getting inspiration image:', error);
      throw error;
    }
  }

  async updateInspirationImageTags(id: number, tags: string[]): Promise<InspirationImage | undefined> {
    try {
      const [updatedImage] = await db.update(schema.inspirationImages).set({ styleTags: tags }).where(eq(schema.inspirationImages.id, id)).returning();
      return updatedImage || undefined;
    } catch (error) {
      console.error('Error updating inspiration image tags:', error);
      throw error;
    }
  }

  async updateInspirationImageSaved(id: number, isSaved: boolean): Promise<InspirationImage | undefined> {
    try {
      const [updatedImage] = await db.update(schema.inspirationImages).set({ isSaved }).where(eq(schema.inspirationImages.id, id)).returning();
      return updatedImage || undefined;
    } catch (error) {
      console.error('Error updating inspiration image saved status:', error);
      throw error;
    }
  }

  async getInspirationImageById(id: number): Promise<InspirationImage | null> {
    try {
      const images = await db.select().from(schema.inspirationImages).where(eq(schema.inspirationImages.id, id));
      return images[0] || null;
    } catch (error) {
      console.error('Error getting inspiration image by ID:', error);
      throw error;
    }
  }

  async updateInspirationImage(id: number, updates: Partial<InsertInspirationImage>): Promise<InspirationImage | null> {
    try {
      const [updatedImage] = await db.update(schema.inspirationImages).set(updates).where(eq(schema.inspirationImages.id, id)).returning();
      return updatedImage || null;
    } catch (error) {
      console.error('Error updating inspiration image:', error);
      throw error;
    }
  }

  async deleteInspirationImage(id: number): Promise<boolean> {
    try {
      await db.delete(schema.inspirationImages).where(eq(schema.inspirationImages.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting inspiration image:', error);
      return false;
    }
  }

  // Clothing item methods - preserve existing logic
  async createClothingItem(item: InsertClothingItem): Promise<ClothingItem> {
    try {
      const [newItem] = await db.insert(schema.clothingItems).values(item).returning();
      return newItem;
    } catch (error) {
      console.error('Error creating clothing item:', error);
      throw error;
    }
  }

  async getClothingItems(userId?: number): Promise<ClothingItem[]> {
    try {
      let query = db.select().from(schema.clothingItems);
      if (userId !== undefined) {
        query = query.where(eq(schema.clothingItems.userId, userId));
      }
      return await query.orderBy(desc(schema.clothingItems.id));
    } catch (error) {
      console.error('Error getting clothing items:', error);
      throw error;
    }
  }

  async getClothingItemsByCategory(category: string, userId?: number): Promise<ClothingItem[]> {
    try {
      let query = db.select().from(schema.clothingItems).where(eq(schema.clothingItems.category, category));
      if (userId !== undefined) {
        query = query.where(and(eq(schema.clothingItems.category, category), eq(schema.clothingItems.userId, userId)));
      }
      return await query.orderBy(desc(schema.clothingItems.id));
    } catch (error) {
      console.error('Error getting clothing items by category:', error);
      throw error;
    }
  }

  async getClothingItem(id: number, userId?: number): Promise<ClothingItem | undefined> {
    try {
      let query = db.select().from(schema.clothingItems).where(eq(schema.clothingItems.id, id));
      if (userId !== undefined) {
        query = query.where(and(eq(schema.clothingItems.id, id), eq(schema.clothingItems.userId, userId)));
      }
      const items = await query;
      return items[0] || undefined;
    } catch (error) {
      console.error('Error getting clothing item:', error);
      throw error;
    }
  }

  async updateClothingItemTags(id: number, tags: string[]): Promise<ClothingItem | undefined> {
    try {
      const [updatedItem] = await db.update(schema.clothingItems).set({ styleTags: tags }).where(eq(schema.clothingItems.id, id)).returning();
      return updatedItem || undefined;
    } catch (error) {
      console.error('Error updating clothing item tags:', error);
      throw error;
    }
  }

  async getClothingItemById(id: number): Promise<ClothingItem | null> {
    try {
      const items = await db.select().from(schema.clothingItems).where(eq(schema.clothingItems.id, id));
      return items[0] || null;
    } catch (error) {
      console.error('Error getting clothing item by ID:', error);
      throw error;
    }
  }

  async updateClothingItem(id: number, updates: Partial<InsertClothingItem>): Promise<ClothingItem | null> {
    try {
      const [updatedItem] = await db.update(schema.clothingItems).set(updates).where(eq(schema.clothingItems.id, id)).returning();
      return updatedItem || null;
    } catch (error) {
      console.error('Error updating clothing item:', error);
      throw error;
    }
  }

  async deleteClothingItem(id: number): Promise<boolean> {
    try {
      await db.delete(schema.clothingItems).where(eq(schema.clothingItems.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting clothing item:', error);
      return false;
    }
  }

  // Email signup methods - preserve existing logic
  async createEmailSignup(email: string): Promise<EmailSignup> {
    try {
      const signup: InsertEmailSignup = { email };
      const [newSignup] = await db.insert(schema.emailSignups).values(signup).returning();
      return newSignup;
    } catch (error) {
      console.error('Error creating email signup:', error);
      throw error;
    }
  }

  async addEmailSignup(signup: InsertEmailSignup): Promise<EmailSignup> {
    try {
      const [newSignup] = await db.insert(schema.emailSignups).values(signup).returning();
      return newSignup;
    } catch (error) {
      console.error('Error adding email signup:', error);
      throw error;
    }
  }

  async getEmailSignups(): Promise<EmailSignup[]> {
    try {
      return await db.select().from(schema.emailSignups).orderBy(desc(schema.emailSignups.id));
    } catch (error) {
      console.error('Error getting email signups:', error);
      throw error;
    }
  }

  // User swipe methods - preserve existing logic for AI recommendations
  async createUserSwipe(swipe: InsertUserSwipe): Promise<UserSwipe> {
    try {
      const [newSwipe] = await db.insert(schema.userSwipes).values(swipe).returning();
      return newSwipe;
    } catch (error) {
      console.error('Error creating user swipe:', error);
      throw error;
    }
  }

  async getUserSwipes(sessionId: string, userId?: number): Promise<UserSwipe[]> {
    try {
      let query = db.select().from(schema.userSwipes).where(eq(schema.userSwipes.sessionId, sessionId));

      if (userId) {
        query = query.where(and(eq(schema.userSwipes.sessionId, sessionId), eq(schema.userSwipes.userId, userId)));
      }

      return await query.orderBy(asc(schema.userSwipes.swipeOrder));
    } catch (error) {
      console.error('Error getting user swipes:', error);
      throw error;
    }
  }

  async getSwipeHistory(sessionId: string): Promise<UserSwipe[]> {
    return this.getUserSwipes(sessionId);
  }

  async updateUserSwipe(id: number, updates: Partial<InsertUserSwipe>): Promise<UserSwipe | null> {
    try {
      const [updatedSwipe] = await db.update(schema.userSwipes).set(updates).where(eq(schema.userSwipes.id, id)).returning();
      return updatedSwipe || null;
    } catch (error) {
      console.error('Error updating user swipe:', error);
      throw error;
    }
  }

  async deleteUserSwipe(id: number): Promise<boolean> {
    try {
      await db.delete(schema.userSwipes).where(eq(schema.userSwipes.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user swipe:', error);
      return false;
    }
  }

  // User style profile methods - preserve existing logic for AI recommendations
  async createUserStyleProfile(profile: InsertUserStyleProfile): Promise<UserStyleProfile> {
    try {
      const [newProfile] = await db.insert(schema.userStyleProfiles).values(profile).returning();
      return newProfile;
    } catch (error) {
      console.error('Error creating user style profile:', error);
      throw error;
    }
  }

  async getUserStyleProfile(sessionId: string, userId?: number): Promise<UserStyleProfile | undefined> {
    try {
      let query = db.select().from(schema.userStyleProfiles).where(eq(schema.userStyleProfiles.sessionId, sessionId));

      if (userId) {
        query = query.where(and(eq(schema.userStyleProfiles.sessionId, sessionId), eq(schema.userStyleProfiles.userId, userId)));
      }

      const profiles = await query.orderBy(desc(schema.userStyleProfiles.id)).limit(1);
      return profiles[0] || undefined;
    } catch (error) {
      console.error('Error getting user style profile:', error);
      throw error;
    }
  }

  async updateUserStyleProfile(id: number, updates: Partial<InsertUserStyleProfile>): Promise<UserStyleProfile | null> {
    try {
      const [updatedProfile] = await db.update(schema.userStyleProfiles).set(updates).where(eq(schema.userStyleProfiles.id, id)).returning();
      return updatedProfile || null;
    } catch (error) {
      console.error('Error updating user style profile:', error);
      throw error;
    }
  }

  async deleteUserStyleProfile(id: number): Promise<boolean> {
    try {
      await db.delete(schema.userStyleProfiles).where(eq(schema.userStyleProfiles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user style profile:', error);
      return false;
    }
  }
}