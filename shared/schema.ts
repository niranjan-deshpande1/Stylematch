import { pgTable, text, serial, integer, jsonb, timestamp, boolean, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Email signups table for coming soon page
export const emailSignups = pgTable("email_signups", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailSignupSchema = createInsertSchema(emailSignups).pick({
  email: true,
});

export type InsertEmailSignup = z.infer<typeof insertEmailSignupSchema>;
export type EmailSignup = typeof emailSignups.$inferSelect;

// Waitlist signups (separate table that already exists)
export const waitlistSignups = pgTable("waitlist_signups", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Style tags are stored as a simple array of strings
export const inspirationImages = pgTable("inspiration_images", {
  id: serial("id").primaryKey(),
  imageUrl: text("imageUrl").notNull(),
  styleTags: text("styleTags").array(),
  createdAt: timestamp("createdAt").defaultNow(),
  userId: integer("userId").notNull(),
  isSaved: boolean("isSaved").default(false),
});

export const insertInspirationImageSchema = createInsertSchema(inspirationImages).pick({
  imageUrl: true,
  userId: true,
  isSaved: true,
  styleTags: true,
});

// Clothing categories
export const clothingCategories = [
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "dresses",
  "suits",
  "other"
] as const;

export const clothingItems = pgTable("clothing_items", {
  id: serial("id").primaryKey(),
  imageUrl: text("imageUrl").notNull(),
  styleTags: text("styleTags").array(),
  category: text("category").notNull().default("other"),
  createdAt: timestamp("createdAt").defaultNow(),
  userId: integer("userId").notNull(),
});

export const insertClothingItemSchema = createInsertSchema(clothingItems).pick({
  imageUrl: true,
  category: true,
  userId: true,
  styleTags: true,
});

// Session table for connect-pg-simple
export const sessions = pgTable("session", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export type InspirationImage = typeof inspirationImages.$inferSelect;
export type InsertInspirationImage = z.infer<typeof insertInspirationImageSchema>;

export type ClothingItem = typeof clothingItems.$inferSelect;
export type InsertClothingItem = z.infer<typeof insertClothingItemSchema>;

export const StyleTagsResponse = z.object({
  tags: z.array(z.string()),
});

export type StyleTagsResponse = z.infer<typeof StyleTagsResponse>;

export const ProductExampleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  link: z.string().optional(),
  where: z.string().optional(),
  price: z.string().optional(),
});

export type ProductExample = z.infer<typeof ProductExampleSchema>;

export const MissingPieceSchema = z.object({
  category: z.string(),
  description: z.string(),
  importance: z.enum(["high", "medium", "low"]),
  reason: z.string(),
  examples: z.array(ProductExampleSchema).optional(),
  searchTerms: z.array(z.string()).optional(),
  wheretoBuy: z.string().optional(),
});

export type MissingPiece = z.infer<typeof MissingPieceSchema>;

export const MissingPiecesResponse = z.object({
  missingPieces: z.array(MissingPieceSchema),
});

export type MissingPiecesResponse = z.infer<typeof MissingPiecesResponse>;

export const OutfitCombinationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  items: z.array(z.number()),
  style: z.string(),
  occasion: z.string(),
  season: z.string().optional(),
});

export type OutfitCombination = z.infer<typeof OutfitCombinationSchema>;

export const OutfitCombinationsResponse = z.object({
  outfits: z.array(OutfitCombinationSchema),
});

export type OutfitCombinationsResponse = z.infer<typeof OutfitCombinationsResponse>;

export const StyleMatchingResponse = z.object({
  matchingItems: z.array(z.number()),
  matchScore: z.number().min(0).max(100),
  styleNotes: z.string(),
});

export type StyleMatchingResponse = z.infer<typeof StyleMatchingResponse>;
