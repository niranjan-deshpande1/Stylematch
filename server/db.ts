import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, and } from 'drizzle-orm';
import * as schema from '@shared/schema';

const { Pool } = pg;

// Initialize PostgreSQL connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
}

// ==================== USER OPERATIONS ====================

export async function getUser(id: number): Promise<schema.User | undefined> {
  try {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return user;
  } catch (error) {
    console.error('Error in getUser:', error);
    return undefined;
  }
}

export async function getUserByUsername(username: string): Promise<schema.User | undefined> {
  try {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    return user;
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return undefined;
  }
}

export async function getUserByEmail(email: string): Promise<schema.User | undefined> {
  try {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return user;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return undefined;
  }
}

export async function createUser(user: schema.InsertUser): Promise<schema.User> {
  try {
    const [newUser] = await db
      .insert(schema.users)
      .values(user)
      .returning();

    return newUser;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<schema.User[]> {
  try {
    return await db.select().from(schema.users);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return [];
  }
}

export async function getUserCount(): Promise<number> {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error in getUserCount:', error);
    return 0;
  }
}

// ==================== INSPIRATION IMAGE OPERATIONS ====================

export async function getInspirationImages(userId?: number): Promise<schema.InspirationImage[]> {
  try {
    if (userId !== undefined) {
      return await db
        .select()
        .from(schema.inspirationImages)
        .where(eq(schema.inspirationImages.userId, userId))
        .orderBy(desc(schema.inspirationImages.createdAt));
    }
    return await db
      .select()
      .from(schema.inspirationImages)
      .orderBy(desc(schema.inspirationImages.createdAt));
  } catch (error) {
    console.error('Error in getInspirationImages:', error);
    return [];
  }
}

export async function getInspirationImage(id: number, userId?: number): Promise<schema.InspirationImage | undefined> {
  try {
    if (userId !== undefined) {
      const [image] = await db
        .select()
        .from(schema.inspirationImages)
        .where(and(
          eq(schema.inspirationImages.id, id),
          eq(schema.inspirationImages.userId, userId)
        ))
        .limit(1);
      return image;
    }
    const [image] = await db
      .select()
      .from(schema.inspirationImages)
      .where(eq(schema.inspirationImages.id, id))
      .limit(1);
    return image;
  } catch (error) {
    console.error('Error in getInspirationImage:', error);
    return undefined;
  }
}

export async function createInspirationImage(image: schema.InsertInspirationImage): Promise<schema.InspirationImage> {
  try {
    const [newImage] = await db
      .insert(schema.inspirationImages)
      .values({
        imageUrl: image.imageUrl,
        userId: image.userId,
        styleTags: image.styleTags || [],
        isSaved: image.isSaved ?? false,
      })
      .returning();
    return newImage;
  } catch (error) {
    console.error('Error in createInspirationImage:', error);
    throw error;
  }
}

export async function updateInspirationImageTags(id: number, tags: string[], userId?: number): Promise<schema.InspirationImage | undefined> {
  try {
    if (userId !== undefined) {
      const [updated] = await db
        .update(schema.inspirationImages)
        .set({ styleTags: tags })
        .where(and(
          eq(schema.inspirationImages.id, id),
          eq(schema.inspirationImages.userId, userId)
        ))
        .returning();
      return updated;
    }
    const [updated] = await db
      .update(schema.inspirationImages)
      .set({ styleTags: tags })
      .where(eq(schema.inspirationImages.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error('Error in updateInspirationImageTags:', error);
    return undefined;
  }
}

export async function updateInspirationImageSaved(id: number, isSaved: boolean, userId?: number): Promise<schema.InspirationImage | undefined> {
  try {
    if (userId !== undefined) {
      const [updated] = await db
        .update(schema.inspirationImages)
        .set({ isSaved })
        .where(and(
          eq(schema.inspirationImages.id, id),
          eq(schema.inspirationImages.userId, userId)
        ))
        .returning();
      return updated;
    }
    const [updated] = await db
      .update(schema.inspirationImages)
      .set({ isSaved })
      .where(eq(schema.inspirationImages.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error('Error in updateInspirationImageSaved:', error);
    return undefined;
  }
}

export async function deleteInspirationImage(id: number, userId?: number): Promise<boolean> {
  try {
    if (userId !== undefined) {
      await db
        .delete(schema.inspirationImages)
        .where(and(
          eq(schema.inspirationImages.id, id),
          eq(schema.inspirationImages.userId, userId)
        ));
    } else {
      await db
        .delete(schema.inspirationImages)
        .where(eq(schema.inspirationImages.id, id));
    }
    return true;
  } catch (error) {
    console.error('Error in deleteInspirationImage:', error);
    return false;
  }
}

// ==================== CLOTHING ITEM OPERATIONS ====================

export async function getClothingItems(userId?: number): Promise<schema.ClothingItem[]> {
  try {
    if (userId !== undefined) {
      return await db
        .select()
        .from(schema.clothingItems)
        .where(eq(schema.clothingItems.userId, userId))
        .orderBy(desc(schema.clothingItems.createdAt));
    }
    return await db
      .select()
      .from(schema.clothingItems)
      .orderBy(desc(schema.clothingItems.createdAt));
  } catch (error) {
    console.error('Error in getClothingItems:', error);
    return [];
  }
}

export async function getClothingItemsByCategory(category: string, userId?: number): Promise<schema.ClothingItem[]> {
  try {
    if (userId !== undefined) {
      return await db
        .select()
        .from(schema.clothingItems)
        .where(and(
          eq(schema.clothingItems.category, category),
          eq(schema.clothingItems.userId, userId)
        ))
        .orderBy(desc(schema.clothingItems.createdAt));
    }
    return await db
      .select()
      .from(schema.clothingItems)
      .where(eq(schema.clothingItems.category, category))
      .orderBy(desc(schema.clothingItems.createdAt));
  } catch (error) {
    console.error('Error in getClothingItemsByCategory:', error);
    return [];
  }
}

export async function getClothingItem(id: number, userId?: number): Promise<schema.ClothingItem | undefined> {
  try {
    if (userId !== undefined) {
      const [item] = await db
        .select()
        .from(schema.clothingItems)
        .where(and(
          eq(schema.clothingItems.id, id),
          eq(schema.clothingItems.userId, userId)
        ))
        .limit(1);
      return item;
    }
    const [item] = await db
      .select()
      .from(schema.clothingItems)
      .where(eq(schema.clothingItems.id, id))
      .limit(1);
    return item;
  } catch (error) {
    console.error('Error in getClothingItem:', error);
    return undefined;
  }
}

export async function createClothingItem(item: schema.InsertClothingItem): Promise<schema.ClothingItem> {
  try {
    const [newItem] = await db
      .insert(schema.clothingItems)
      .values({
        imageUrl: item.imageUrl,
        category: item.category || 'other',
        userId: item.userId,
        styleTags: item.styleTags || [],
      })
      .returning();
    return newItem;
  } catch (error) {
    console.error('Error in createClothingItem:', error);
    throw error;
  }
}

export async function updateClothingItemTags(id: number, tags: string[], userId?: number): Promise<schema.ClothingItem | undefined> {
  try {
    if (userId !== undefined) {
      const [updated] = await db
        .update(schema.clothingItems)
        .set({ styleTags: tags })
        .where(and(
          eq(schema.clothingItems.id, id),
          eq(schema.clothingItems.userId, userId)
        ))
        .returning();
      return updated;
    }
    const [updated] = await db
      .update(schema.clothingItems)
      .set({ styleTags: tags })
      .where(eq(schema.clothingItems.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error('Error in updateClothingItemTags:', error);
    return undefined;
  }
}

export async function deleteClothingItem(id: number, userId?: number): Promise<boolean> {
  try {
    if (userId !== undefined) {
      await db
        .delete(schema.clothingItems)
        .where(and(
          eq(schema.clothingItems.id, id),
          eq(schema.clothingItems.userId, userId)
        ));
    } else {
      await db
        .delete(schema.clothingItems)
        .where(eq(schema.clothingItems.id, id));
    }
    return true;
  } catch (error) {
    console.error('Error in deleteClothingItem:', error);
    return false;
  }
}

// ==================== EMAIL SIGNUP OPERATIONS ====================

export async function createEmailSignup(email: string): Promise<schema.EmailSignup> {
  try {
    const [signup] = await db
      .insert(schema.emailSignups)
      .values({ email })
      .returning();
    return signup;
  } catch (error) {
    console.error('Error in createEmailSignup:', error);
    throw error;
  }
}

export async function getEmailSignups(): Promise<schema.EmailSignup[]> {
  try {
    return await db
      .select()
      .from(schema.emailSignups)
      .orderBy(desc(schema.emailSignups.createdAt));
  } catch (error) {
    console.error('Error in getEmailSignups:', error);
    return [];
  }
}

// Waitlist signups (using separate table)
export async function createWaitlistSignup(email: string): Promise<any> {
  try {
    const [signup] = await db
      .insert(schema.waitlistSignups)
      .values({ email })
      .returning();
    return signup;
  } catch (error) {
    console.error('Error in createWaitlistSignup:', error);
    throw error;
  }
}

export async function getWaitlistSignups(): Promise<any[]> {
  try {
    return await db
      .select()
      .from(schema.waitlistSignups)
      .orderBy(desc(schema.waitlistSignups.createdAt));
  } catch (error) {
    console.error('Error in getWaitlistSignups:', error);
    return [];
  }
}

// Export the pool for session store
export { pool };
