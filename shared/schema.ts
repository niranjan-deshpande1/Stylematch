import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Style tags are stored as a simple array of strings
export const inspirationImages = pgTable("inspiration_images", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  styleTags: jsonb("style_tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInspirationImageSchema = createInsertSchema(inspirationImages).pick({
  imageUrl: true,
});

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
  imageUrl: text("image_url").notNull(),
  styleTags: jsonb("style_tags").$type<string[]>().notNull().default([]),
  category: text("category").notNull().default("other"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClothingItemSchema = createInsertSchema(clothingItems).pick({
  imageUrl: true,
  category: true,
});

export type InspirationImage = typeof inspirationImages.$inferSelect;
export type InsertInspirationImage = z.infer<typeof insertInspirationImageSchema>;

export type ClothingItem = typeof clothingItems.$inferSelect;
export type InsertClothingItem = z.infer<typeof insertClothingItemSchema>;

export const StyleTagsResponse = z.object({
  tags: z.array(z.string()),
});

export type StyleTagsResponse = z.infer<typeof StyleTagsResponse>;

export const MissingPieceSchema = z.object({
  category: z.string(),
  description: z.string(),
  importance: z.enum(["high", "medium", "low"]),
  reason: z.string(),
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
