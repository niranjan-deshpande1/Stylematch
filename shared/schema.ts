import { pgTable, text, serial, integer, jsonb, timestamp, boolean, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailSignupSchema = createInsertSchema(emailSignups).pick({
  email: true,
});

export type InsertEmailSignup = z.infer<typeof insertEmailSignupSchema>;
export type EmailSignup = typeof emailSignups.$inferSelect;

// Style tags are stored as a simple array of strings
export const inspirationImages = pgTable("inspiration_images", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  styleTags: jsonb("style_tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: integer("user_id").notNull(),
  isSaved: boolean("is_saved").notNull().default(false),
});

export const insertInspirationImageSchema = createInsertSchema(inspirationImages).pick({
  imageUrl: true,
  userId: true,
  isSaved: true,
  styleTags: true,
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
  userId: integer("user_id").notNull(),
});

export const insertClothingItemSchema = createInsertSchema(clothingItems).pick({
  imageUrl: true,
  category: true,
  userId: true,
  styleTags: true,
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

// Shopping product recommendations
export const ProductRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  brand: z.string(),
  price: z.number(),
  currency: z.string().default('USD'),
  imageUrl: z.string(),
  productUrl: z.string(),
  description: z.string(),
  category: z.string(),
  styleTags: z.array(z.string()),
  matchScore: z.number().min(0).max(100),
  matchReason: z.string()
});

export type ProductRecommendation = z.infer<typeof ProductRecommendationSchema>;

export const ShoppingRecommendationsResponse = z.object({
  recommendations: z.array(ProductRecommendationSchema),
  totalCount: z.number(),
  searchQuery: z.string(),
  category: z.string().optional()
});

export type ShoppingRecommendationsResponse = z.infer<typeof ShoppingRecommendationsResponse>;

// User swipe data for onboarding flow
export const userSwipes = pgTable('user_swipes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  sessionId: varchar('session_id', { length: 255 }),
  imageId: integer('image_id').notNull(),
  swipeDirection: varchar('swipe_direction', { length: 10 }).notNull(), // 'like' or 'dislike'
  styleTags: text('style_tags').array().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertUserSwipeSchema = createInsertSchema(userSwipes).pick({
  userId: true,
  sessionId: true,
  imageId: true,
  swipeDirection: true,
  styleTags: true,
});

export type InsertUserSwipe = z.infer<typeof insertUserSwipeSchema>;
export type UserSwipe = typeof userSwipes.$inferSelect;

// User style profiles generated from swipe data
export const userStyleProfiles = pgTable('user_style_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  sessionId: varchar('session_id', { length: 255 }),
  styleVector: jsonb('style_vector').notNull(), // {"minimalist": 0.7, "techwear": 0.5}
  summaryText: text('summary_text'),
  confidenceScore: real('confidence_score').default(0.0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertUserStyleProfileSchema = createInsertSchema(userStyleProfiles).pick({
  userId: true,
  sessionId: true,
  styleVector: true,
  summaryText: true,
  confidenceScore: true,
});

export type InsertUserStyleProfile = z.infer<typeof insertUserStyleProfileSchema>;
export type UserStyleProfile = typeof userStyleProfiles.$inferSelect;

// Response schemas for swipe API
export const SwipeResponse = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type SwipeResponse = z.infer<typeof SwipeResponse>;

export const StyleProfileResponse = z.object({
  styleVector: z.record(z.number()),
  summaryText: z.string(),
  confidenceScore: z.number(),
  swipeCount: z.number(),
});

export type StyleProfileResponse = z.infer<typeof StyleProfileResponse>;
