import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  appSettings,
  clothingItems,
  emailSignups,
  inspirationImages,
  users,
  type ClothingItem,
  type InsertUser,
  type InspirationImage,
  type User,
} from "@shared/schema";

// Every query on closet items and inspiration images is scoped to an owner id
// (a user id, or a negative guest id). There is deliberately no way to read
// another owner's rows through this module.

// ---- Users ----------------------------------------------------------------

export async function getUser(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

/** Looks a user up by username or email, whichever they typed at login. */
export async function findUserByLogin(login: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.username, login), sql`lower(${users.email}) = ${login.toLowerCase()}`))
    .limit(1);
  return user;
}

export async function isUsernameOrEmailTaken(username: string, email: string) {
  const rows = await db
    .select({ username: users.username, email: users.email })
    .from(users)
    .where(or(eq(users.username, username), sql`lower(${users.email}) = ${email.toLowerCase()}`));
  return {
    username: rows.some((r) => r.username === username),
    email: rows.some((r) => r.email.toLowerCase() === email.toLowerCase()),
  };
}

export async function createUser(user: InsertUser): Promise<User> {
  const [created] = await db.insert(users).values(user).returning();
  return created;
}

/**
 * When a guest signs up or logs in, their closet and inspiration images move
 * over to the real account so they don't lose what they uploaded.
 */
export async function transferGuestData(guestId: number, userId: number) {
  await db.transaction(async (tx) => {
    await tx.update(clothingItems).set({ userId }).where(eq(clothingItems.userId, guestId));
    await tx.update(inspirationImages).set({ userId }).where(eq(inspirationImages.userId, guestId));
  });
}

// ---- Closet ---------------------------------------------------------------

export function getClothingItems(ownerId: number, category?: string): Promise<ClothingItem[]> {
  const filter = category
    ? and(eq(clothingItems.userId, ownerId), eq(clothingItems.category, category))
    : eq(clothingItems.userId, ownerId);
  return db.select().from(clothingItems).where(filter).orderBy(desc(clothingItems.createdAt));
}

export async function getClothingItem(id: number, ownerId: number) {
  const [item] = await db
    .select()
    .from(clothingItems)
    .where(and(eq(clothingItems.id, id), eq(clothingItems.userId, ownerId)))
    .limit(1);
  return item;
}

export async function createClothingItem(values: {
  ownerId: number;
  imageUrl: string;
  category: string;
}): Promise<ClothingItem> {
  const [item] = await db
    .insert(clothingItems)
    .values({ userId: values.ownerId, imageUrl: values.imageUrl, category: values.category, styleTags: [] })
    .returning();
  return item;
}

export async function setClothingItemTags(id: number, ownerId: number, tags: string[]) {
  const [item] = await db
    .update(clothingItems)
    .set({ styleTags: tags })
    .where(and(eq(clothingItems.id, id), eq(clothingItems.userId, ownerId)))
    .returning();
  return item;
}

export async function deleteClothingItem(id: number, ownerId: number) {
  const [item] = await db
    .delete(clothingItems)
    .where(and(eq(clothingItems.id, id), eq(clothingItems.userId, ownerId)))
    .returning();
  return item;
}

export async function countItemsByCategory(ownerId: number): Promise<Record<string, number>> {
  const rows = await db
    .select({ category: clothingItems.category, count: sql<number>`count(*)::int` })
    .from(clothingItems)
    .where(eq(clothingItems.userId, ownerId))
    .groupBy(clothingItems.category);
  return Object.fromEntries(rows.map((r) => [r.category, r.count]));
}

// ---- Inspiration ----------------------------------------------------------

export function getInspirationImages(ownerId: number): Promise<InspirationImage[]> {
  return db
    .select()
    .from(inspirationImages)
    .where(eq(inspirationImages.userId, ownerId))
    .orderBy(desc(inspirationImages.createdAt));
}

export async function getInspirationImage(id: number, ownerId: number) {
  const [image] = await db
    .select()
    .from(inspirationImages)
    .where(and(eq(inspirationImages.id, id), eq(inspirationImages.userId, ownerId)))
    .limit(1);
  return image;
}

export async function createInspirationImage(values: { ownerId: number; imageUrl: string }) {
  const [image] = await db
    .insert(inspirationImages)
    .values({ userId: values.ownerId, imageUrl: values.imageUrl, styleTags: [], isSaved: false })
    .returning();
  return image;
}

export async function updateInspirationImage(
  id: number,
  ownerId: number,
  changes: Partial<Pick<InspirationImage, "styleTags" | "isSaved" | "missingPieces">>,
) {
  const [image] = await db
    .update(inspirationImages)
    .set(changes)
    .where(and(eq(inspirationImages.id, id), eq(inspirationImages.userId, ownerId)))
    .returning();
  return image;
}

export async function deleteInspirationImage(id: number, ownerId: number) {
  const [image] = await db
    .delete(inspirationImages)
    .where(and(eq(inspirationImages.id, id), eq(inspirationImages.userId, ownerId)))
    .returning();
  return image;
}

/** Missing-pieces answers depend on the closet, so they're dropped whenever it changes. */
export async function clearMissingPieces(ownerId: number) {
  await db
    .update(inspirationImages)
    .set({ missingPieces: null })
    .where(eq(inspirationImages.userId, ownerId));
}

// ---- Images ---------------------------------------------------------------

/** True if this image URL belongs to one of the owner's closet or inspiration rows. */
export async function ownsImage(ownerId: number, imageUrl: string): Promise<boolean> {
  const [closet] = await db
    .select({ id: clothingItems.id })
    .from(clothingItems)
    .where(and(eq(clothingItems.userId, ownerId), eq(clothingItems.imageUrl, imageUrl)))
    .limit(1);
  if (closet) return true;

  const [inspiration] = await db
    .select({ id: inspirationImages.id })
    .from(inspirationImages)
    .where(and(eq(inspirationImages.userId, ownerId), eq(inspirationImages.imageUrl, imageUrl)))
    .limit(1);
  return Boolean(inspiration);
}

// ---- Waitlist & settings --------------------------------------------------

/** Adds an email to the waitlist. Returns false if it was already there. */
export async function addToWaitlist(email: string): Promise<boolean> {
  const inserted = await db
    .insert(emailSignups)
    .values({ email })
    .onConflictDoNothing()
    .returning({ id: emailSignups.id });
  return inserted.length > 0;
}

export async function getSetting(key: string): Promise<string | undefined> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return row?.value;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}
