import { pgTable, text, serial, integer, timestamp, boolean, varchar, json, jsonb, index } from "drizzle-orm/pg-core";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Clothing items and inspiration images belong to an "owner". Signed-in users
// own rows with their (positive) user id. Guests get a random negative id that
// lives in their session, which is why userId has no foreign key.
export const clothingItems = pgTable(
  "clothing_items",
  {
    id: serial("id").primaryKey(),
    imageUrl: text("image_url").notNull(),
    styleTags: text("style_tags").array(),
    category: text("category").notNull().default("other"),
    createdAt: timestamp("created_at").defaultNow(),
    userId: integer("user_id").notNull(),
  },
  (table) => [index("clothing_items_user_id_idx").on(table.userId)],
);

export const inspirationImages = pgTable(
  "inspiration_images",
  {
    id: serial("id").primaryKey(),
    imageUrl: text("image_url").notNull(),
    styleTags: text("style_tags").array(),
    createdAt: timestamp("created_at").defaultNow(),
    userId: integer("user_id").notNull(),
    isSaved: boolean("is_saved").default(false),
    // Last missing-pieces answer from the AI, cleared whenever the owner's closet changes.
    missingPieces: jsonb("missing_pieces").$type<MissingPiece[]>(),
  },
  (table) => [index("inspiration_images_user_id_idx").on(table.userId)],
);

// Waitlist emails collected while the site is in coming-soon mode.
export const emailSignups = pgTable("email_signups", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Small key/value table for settings that need to survive a restart
// (currently just the site mode).
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Managed by connect-pg-simple. Declared here so `db:push` leaves it alone.
export const sessions = pgTable("session", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type PublicUser = Omit<User, "password">;
export type ClothingItem = typeof clothingItems.$inferSelect;
export type InspirationImage = typeof inspirationImages.$inferSelect;

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const clothingCategories = [
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "dresses",
  "suits",
  "other",
] as const;

export const outfitSeasons = [
  { id: "all-season", name: "all season" },
  { id: "spring", name: "spring" },
  { id: "summer", name: "summer" },
  { id: "fall", name: "fall" },
  { id: "winter", name: "winter" },
] as const;

export const outfitThemes = [
  { id: "chill", name: "chill", description: "relaxed and comfortable" },
  { id: "old-money", name: "old money", description: "timeless elegance" },
  { id: "streetwear", name: "streetwear", description: "urban and trendy" },
  { id: "minimalist", name: "minimalist", description: "clean and simple" },
  { id: "boho", name: "boho", description: "free-spirited and artistic" },
  { id: "preppy", name: "preppy", description: "classic and polished" },
  { id: "edgy", name: "edgy", description: "bold and alternative" },
  { id: "romantic", name: "romantic", description: "soft and feminine" },
] as const;

export const siteModes = ["app", "coming-soon"] as const;
export type SiteMode = (typeof siteModes)[number];

// ---------------------------------------------------------------------------
// API payloads
// ---------------------------------------------------------------------------

export const missingPieceSchema = z.object({
  category: z.string(),
  description: z.string(),
  importance: z.enum(["high", "medium", "low"]),
  reason: z.string(),
  searchTerms: z.array(z.string()).optional(),
  whereToBuy: z.string().optional(),
});

export type MissingPiece = z.infer<typeof missingPieceSchema>;

export interface Outfit {
  id: string;
  name: string;
  description: string;
  items: number[];
  style: string;
  occasion: string;
  season: string;
}

export interface OutfitsResponse {
  outfits: Outfit[];
  message?: string;
}

export interface StyleMatchResponse {
  matchingItems: number[];
  matchScore: number;
  coveredTags: string[];
  missingTags: string[];
}

export interface SessionResponse {
  user: PublicUser | null;
  isGuest: boolean;
}
