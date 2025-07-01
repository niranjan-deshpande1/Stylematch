import type { Express, Request as ExpressRequest, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import fs from "fs";
import path from "path";
import { analyzeClothingImage, analyzeOutfitImage, identifyMissingPieces, generateOutfitCombinations } from "./utils/openai";
import { setupAuth, isAuthenticated } from "./auth";
import {
  clothingCategories,
  StyleTagsResponse,
  MissingPiecesResponse,
  OutfitCombination,
  OutfitCombinationsResponse,
  StyleMatchingResponse,
  InspirationImage
} from "@shared/schema";

// Define a new Request type that includes multer's file property
interface Request extends ExpressRequest {
  file?: Express.Multer.File;
}

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Create directory for image uploads if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper function to save base64 image and return URL
const saveImage = async (buffer: Buffer, prefix: string): Promise<string> => {
  const filename = `${prefix}_${Date.now()}.jpg`;
  const filepath = path.join(uploadDir, filename);
  await fs.promises.writeFile(filepath, buffer);
  return `/api/images/${filename}`;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // OPTIONS preflight for CORS - must be first
  app.options('/api/email-signup', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
  });

  // Email signup endpoint - direct database storage
  app.post('/api/email-signup', async (req, res) => {
    // Set CORS headers for all domains
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400');

    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email is required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Save directly to PostgreSQL database
      try {
        const result = await storage.createEmailSignup(email);

        // Also save to file as backup
        const fs = await import('fs/promises');
        const timestamp = new Date().toISOString();
        await fs.appendFile('email-signups.txt', `${timestamp} - ${email} - FROM: ${req.get('origin') || 'unknown'}\n`);

        res.json({
          message: 'Thank you! We will notify you when we launch.',
          status: 'success'
        });
      } catch (dbError) {
        console.error('Database save failed:', dbError);

        // Fallback to file only
        const fs = await import('fs/promises');
        const timestamp = new Date().toISOString();
        await fs.appendFile('email-signups.txt', `${timestamp} - ${email} - FROM: ${req.get('origin') || 'unknown'}\n`);

        res.json({
          message: 'Thank you! We will notify you when we launch.',
          status: 'success'
        });
      }
    } catch (error) {
      console.error('Email signup error:', error);
      res.status(500).json({ message: 'Unable to save email right now. Please try again.' });
    }
  });

  // Authentication is already set up in server/index.ts

  // Serve uploaded images
  app.get('/api/images/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);
    res.sendFile(filepath);
  });

  // Get all inspiration images - always return content regardless of auth status
  app.get('/api/inspiration', async (req, res) => {
    try {
      // not logged in, so use the guest id
      // This ensures content is always available regardless of login status
      const userId = req.user?.id || 9999;

      // Get images with this userId (either actual user or guest user)
      const images = await storage.getInspirationImages(userId);

      // Always return images, even if the array is empty
      res.json(images);
    } catch (error) {
      console.error('Error fetching inspiration images:', error);
      res.status(500).json({ message: 'Failed to fetch inspiration images' });
    }
  });

  // Helper to get user ID from request
  const getUserId = (req: Request): number | null => {
    // Check if the user is logged in
    if (req.user?.id) {
      // Authenticated user, return their actual ID
      return req.user.id;
    } else if (req.headers['x-guest-mode'] === 'true' || req.query.guestMode === 'true') {
      // For guest users, use a designated guest ID (9999)
      // This ensures guest content doesn't interfere with real users
      return 9999;
    }

    // User is neither authenticated nor in guest mode
    return null;
  };

  // Upload inspiration image
  app.post('/api/inspiration', upload.single('image'), async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Please log in to upload images' });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      // Save image and get URL
      const imageUrl = await saveImage(req.file.buffer, 'inspiration');

      // Create inspiration image record
      const newImage = await storage.createInspirationImage({
        imageUrl,
        userId,
        isSaved: false
      });

      res.status(201).json(newImage);
    } catch (error) {
      console.error('Error uploading inspiration image:', error);
      res.status(500).json({ message: 'Failed to upload inspiration image' });
    }
  });

  // Analyze inspiration image with AI
  app.post('/api/inspiration/:id/analyze', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);

      if (userId === null) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const image = await storage.getInspirationImage(id, userId);

      if (!image) {
        return res.status(404).json({ message: 'Inspiration image not found' });
      }

      // Get image file path from URL
      const filename = path.basename(image.imageUrl);
      const filepath = path.join(uploadDir, filename);

      // Read image file as base64
      const buffer = await fs.promises.readFile(filepath);
      const base64Image = buffer.toString('base64');

      // Analyze image with OpenAI
      const tags = await analyzeOutfitImage(base64Image);

      // Update inspiration image with tags
      const updatedImage = await storage.updateInspirationImageTags(id, tags);

      res.json(updatedImage);
    } catch (error) {
      console.error('Error analyzing inspiration image:', error);
      res.status(500).json({ message: 'Failed to analyze inspiration image' });
    }
  });

  // Delete inspiration image
  app.delete('/api/inspiration/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);

      if (userId === null) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const image = await storage.getInspirationImage(id, userId);

      if (!image) {
        return res.status(404).json({ message: 'Inspiration image not found' });
      }

      // Get image file path from URL
      const filename = path.basename(image.imageUrl);
      const filepath = path.join(uploadDir, filename);

      // Delete from storage
      const deleted = await storage.deleteInspirationImage(id);

      // Also delete physical file if needed
      try {
        await fs.promises.unlink(filepath);
      } catch (fileError) {
        console.warn('Could not delete file:', filepath, fileError);
      }

      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: 'Failed to delete inspiration image' });
      }
    } catch (error) {
      console.error('Error deleting inspiration image:', error);
      res.status(500).json({ message: 'Failed to delete inspiration image' });
    }
  });

  // Save/unsave inspiration
  app.post('/api/inspiration/:id/save', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'Please log in to save images' });
      }

      const id = parseInt(req.params.id);
      const image = await storage.getInspirationImage(id, userId);

      if (!image) {
        return res.status(404).json({ message: 'Inspiration image not found' });
      }

      const updated = await storage.updateInspirationImageSaved(id, !image.isSaved);
      res.json(updated);
    } catch (error) {
      console.error('Error saving inspiration:', error);
      res.status(500).json({ message: 'Failed to save inspiration' });
    }
  });

  // Get all clothing items
  app.get('/api/closet', async (req, res) => {
    try {
      const category = req.query.category as string;
      const userId = getUserId(req);

      // Return empty array if no user ID is available
      if (userId === null) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      let items;
      if (category && clothingCategories.includes(category as any)) {
        items = await storage.getClothingItemsByCategory(category, userId);
      } else {
        items = await storage.getClothingItems(userId);
      }

      res.json(items);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch clothing items' });
    }
  });

  // Upload clothing item
  app.post('/api/closet', upload.single('image'), async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Please log in to upload items' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const category = req.body.category || 'other';

      // Validate category
      if (!clothingCategories.includes(category as any)) {
        return res.status(400).json({ message: 'Invalid category' });
      }

      // Save image and get URL
      const imageUrl = await saveImage(req.file.buffer, 'closet');

      // Create clothing item record
      const newItem = await storage.createClothingItem({
        imageUrl,
        category,
        userId,
        styleTags: []
      });

      res.status(201).json(newItem);
    } catch (error) {
      console.error('Error uploading clothing item:', error);
      res.status(500).json({ message: 'Failed to upload clothing item' });
    }
  });

  // Analyze clothing item with AI
  app.post('/api/closet/:id/analyze', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);

      if (userId === null) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const item = await storage.getClothingItem(id, userId);

      if (!item) {
        return res.status(404).json({ message: 'Clothing item not found' });
      }

      // Get image file path from URL
      const filename = path.basename(item.imageUrl);
      const filepath = path.join(uploadDir, filename);

      // Read image file as base64
      const buffer = await fs.promises.readFile(filepath);
      const base64Image = buffer.toString('base64');

      // Analyze image with OpenAI
      const tags = await analyzeClothingImage(base64Image);

      // Update clothing item with tags
      const updatedItem = await storage.updateClothingItemTags(id, tags);

      res.json(updatedItem);
    } catch (error) {
      console.error('Error analyzing clothing item:', error);
      res.status(500).json({ message: 'Failed to analyze clothing item' });
    }
  });

  // Delete clothing item
  app.delete('/api/closet/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);

      if (userId === null) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const item = await storage.getClothingItem(id, userId);

      if (!item) {
        return res.status(404).json({ message: 'Clothing item not found' });
      }

      // Delete item from storage
      const deleted = await storage.deleteClothingItem(id);

      if (deleted) {
        // Try to delete the image file but don't fail if it doesn't exist
        try {
          const filename = path.basename(item.imageUrl);
          const filepath = path.join(uploadDir, filename);
          await fs.promises.unlink(filepath);
        } catch (error) {
          console.error('Error deleting image file:', error);
        }

        res.status(204).end();
      } else {
        res.status(500).json({ message: 'Failed to delete clothing item' });
      }
    } catch (error) {
      console.error('Error deleting clothing item:', error);
      res.status(500).json({ message: 'Failed to delete clothing item' });
    }
  });

  // Get missing pieces recommendations based on inspiration image
  app.get('/api/inspiration/:id/missing-pieces', async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Check for guest mode directly (similar to our updated inspiration endpoint)
      const isGuestMode = req.headers['x-guest-mode'] === 'true' || req.query.guestMode === 'true';

      // Get user ID, defaulting to guest ID in guest mode
      let userId = req.user?.id as number | null;
      if (isGuestMode && !userId) {
        userId = 9999; // Guest mode ID
      }

      // If there's no user ID at this point, we're not in guest mode and not authenticated
      if (userId === null) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const image = await storage.getInspirationImage(id, userId);

      if (!image) {
        return res.status(404).json({ message: 'Inspiration image not found' });
      }

      // Get image file path from URL
      const filename = path.basename(image.imageUrl);
      const filepath = path.join(uploadDir, filename);

      // Read image file as base64
      const buffer = await fs.promises.readFile(filepath);
      const base64Image = buffer.toString('base64');

      // Get all clothing items to build a profile of user's closet (filtered by userId)
      const clothingItems = await storage.getClothingItems(userId);
      const userClosetTags = clothingItems.flatMap(item => item.styleTags || []);

      // Identify missing pieces with OpenAI
      const missingPieces = await identifyMissingPieces(base64Image, userClosetTags);

      res.json({ missingPieces });
    } catch (error) {
      console.error('Error identifying missing pieces:', error);
      res.status(500).json({ message: 'Failed to identify missing pieces' });
    }
  });

  // Get categories and counts
  app.get('/api/categories', async (req, res) => {
    try {
      const userId = getUserId(req);

      // Return empty counts if no user ID is available
      if (userId === null) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const items = await storage.getClothingItems(userId);

      // Count items by category
      const categoryCounts = clothingCategories.reduce((acc, category) => {
        acc[category] = items.filter(item => item.category === category).length;
        return acc;
      }, {} as Record<string, number>);

      // Add total count
      categoryCounts.all = items.length;

      res.json(categoryCounts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // Style matching between inspiration and closet items
  app.get('/api/inspiration/:id/matching', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);

      // Return empty result if no user ID is available
      if (userId === null) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const image = await storage.getInspirationImage(id, userId);

      if (!image) {
        return res.status(404).json({ message: 'Inspiration image not found' });
      }

      if (!image.styleTags || image.styleTags.length === 0) {
        return res.status(400).json({ message: 'Inspiration image has no style tags. Analyze it first.' });
      }

      // Get all clothing items for this user
      const clothingItems = await storage.getClothingItems(userId);

      // Calculate matching scores for each item
      // An item is considered a match if it shares at least one tag with the inspiration
      const matchingItemIds = clothingItems
        .filter(item => {
          if (!item.styleTags || item.styleTags.length === 0) return false;
          return item.styleTags.some(tag =>
            image.styleTags.includes(tag)
          );
        })
        .map(item => item.id);

      // Calculate a match score (0-100) - higher means more tags match
      const matchScore = Math.min(100, Math.floor((matchingItemIds.length / clothingItems.length) * 100)) || 0;

      // Generate style notes
      const styleNotes = matchingItemIds.length > 0
        ? `You have ${matchingItemIds.length} items in your closet that match this style.`
        : "No matching items found. Consider adding more variety to your closet.";

      res.json({
        matchingItems: matchingItemIds,
        matchScore,
        styleNotes
      });
    } catch (error) {
      console.error('Error finding style matches:', error);
      res.status(500).json({ message: 'Failed to find style matches' });
    }
  });

  // Get outfit combinations
  app.get('/api/outfits', async (req, res) => {
    try {
      // Get filter parameters
      const style = req.query.style as string;
      const season = req.query.season as string;
      const themeId = req.query.themeId as string;
      const userId = getUserId(req);

      // Return empty result if no user ID is available
      if (userId === null) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get all clothing items from the storage for this user
      const allClosetItems = await storage.getClothingItems(userId);
      if (allClosetItems.length === 0) {
        return res.json({ outfits: [] });
      }

      // Apply filters to clothing items before generating outfits
      let closetItems = allClosetItems;

      // Filter by style if specified
      if (style && style.trim() !== '') {
        closetItems = closetItems.filter(item => {
          const itemTags = (item.styleTags || []).map((tag: string) => tag.toLowerCase());
          const matches = itemTags.includes(style.toLowerCase());
          return matches;
        });
      }

      // Filter by season if specified
      if (season && season.trim() !== '' && season !== 'all-season') {
        closetItems = closetItems.filter(item => {
          const itemTags = (item.styleTags || []).map((tag: string) => tag.toLowerCase());
          const matches = itemTags.includes(season.toLowerCase());
          return matches;
        });

        // For fall/winter: enforce outerwear + no shorts
        if (season === 'fall' || season === 'winter') {
          const outerwearItems = closetItems.filter(item => item.category === 'outerwear');
          const pantsItems = closetItems.filter(item => item.category === 'bottoms' && !item.styleTags?.some(tag => tag.includes('shorts')));

          if (outerwearItems.length === 0) {
            return res.json({
              outfits: [],
              message: `Fall/Winter outfits require outerwear. Add jackets, hoodies, or coats to your closet.`
            });
          }

          if (pantsItems.length === 0) {
            return res.json({
              outfits: [],
              message: `Fall/Winter outfits require pants (no shorts). Add pants or jeans to your closet.`
            });
          }

          // Filter out shorts from bottoms for fall/winter
          closetItems = closetItems.filter(item => {
            if (item.category === 'bottoms') {
              return !item.styleTags?.some(tag => tag.includes('shorts'));
            }
            return true;
          });
        }
      }

      // Filter by theme/color if specified
      if (themeId && themeId.trim() !== '' && themeId !== 'neutral') {
        closetItems = closetItems.filter(item => {
          const itemTags = (item.styleTags || []).map((tag: string) => tag.toLowerCase());

          // Always include shoes regardless of theme - they're essential for outfit composition
          if (item.category === 'shoes') {
            return true;
          }

          let matches = false;
          switch (themeId) {
            case 'dark':
              // Dark palette: similar to monochrome but excluding white
              const darkPaletteColors = ['black', 'gray', 'grey', 'burgundy', 'brown'];
              const lightPaletteColors = ['white', 'light blue', 'cream', 'beige', 'tan'];
              matches = itemTags.some(tag => darkPaletteColors.some(dark => tag.includes(dark))) ||
                       !itemTags.some(tag => lightPaletteColors.some(light => tag.includes(light)));
              break;

            case 'monochrome':
              // 50% lenient: mainly black, white, gray but some flexibility
              const monochromeColors = ['black', 'white', 'grey', 'gray'];
              const coloredItems = ['blue', 'red', 'burgundy', 'brown', 'tan', 'beige', 'taupe'];
              const hasMonochrome = itemTags.some(tag => monochromeColors.some(mono => tag.includes(mono)));
              const hasColor = itemTags.some(tag => coloredItems.some(colored => tag.includes(colored)));
              // Include if has monochrome colors OR doesn't have obvious colors (50% lenient)
              matches = hasMonochrome || !hasColor;
              break;

            case 'pastel':
              // Somewhat strict: lighter colors on the spectrum
              const pastelColors = ['white', 'light blue', 'beige', 'taupe', 'cream'];
              const pastelDarkColors = ['black', 'burgundy', 'brown'];
              matches = itemTags.some(tag => pastelColors.some(pastel => tag.includes(pastel))) ||
                       !itemTags.some(tag => pastelDarkColors.some(dark => tag.includes(dark)));
              break;

            case 'vibrant':
              // Include bright and bold colors
              const vibrantColors = ['red', 'burgundy', 'blue'];
              const neutrals = ['white', 'black', 'gray', 'grey'];
              matches = itemTags.some(tag => vibrantColors.some(vibrant => tag.includes(vibrant))) ||
                       itemTags.some(tag => neutrals.some(neutral => tag.includes(neutral))); // neutrals can complement vibrant
              break;

            case 'earthy':
              // Check for earthy tags or earthy colors (including denim)
              const earthyToneCheck = itemTags.some(tag => ['earthy', 'earth tone'].some(earthy => tag.includes(earthy)));
              const earthyColors = ['brown', 'tan', 'beige', 'taupe', 'denim', 'blue']; // denim is earthy
              const earthyColorCheck = itemTags.some(tag => earthyColors.some(earthy => tag.includes(earthy)));
              matches = earthyToneCheck || earthyColorCheck;
              break;

            case 'cool':
              // Cool tones: check for cool tone tags or cool colors
              const coolToneCheck = itemTags.some(tag => ['cool', 'cool tone'].some(cool => tag.includes(cool)));
              const coolColors = ['blue', 'light blue', 'gray', 'grey'];
              const coolColorCheck = itemTags.some(tag => coolColors.some(cool => tag.includes(cool)));
              matches = coolToneCheck || coolColorCheck;
              break;

            case 'warm':
              // Warm tones: check for warm tone tags or warm colors
              const warmToneCheck = itemTags.some(tag => ['warm', 'earth tone'].some(warm => tag.includes(warm)));
              const warmColors = ['red', 'burgundy', 'brown', 'tan'];
              const warmColorCheck = itemTags.some(tag => warmColors.some(warm => tag.includes(warm)));
              matches = warmToneCheck || warmColorCheck;
              break;

            case 'neutral':
              // Somewhat lenient but similar to monochrome
              const neutralColors = ['black', 'white', 'grey', 'gray', 'beige', 'tan', 'taupe'];
              const brightColors = ['blue', 'red', 'burgundy'];
              matches = itemTags.some(tag => neutralColors.some(neutral => tag.includes(neutral))) ||
                       !itemTags.some(tag => brightColors.some(bright => tag.includes(bright)));
              break;

            default:
              matches = true;
          }

          return matches;
        });
      }

      // Check if filtering left us with enough items - implement fallback logic
      if (closetItems.length === 0) {
        // Fallback: try with just style or season filter, not both
        if (style && season && season !== 'all-season') {
          closetItems = allClosetItems.filter(item => {
            const itemTags = (item.styleTags || []).map((tag: string) => tag.toLowerCase());
            return itemTags.includes(style.toLowerCase());
          });
        } else if (season && season !== 'all-season') {
          closetItems = allClosetItems.filter(item => {
            const itemTags = (item.styleTags || []).map((tag: string) => tag.toLowerCase());
            return itemTags.includes(season.toLowerCase());
          });
        } else {
          closetItems = allClosetItems;
        }

        if (closetItems.length === 0) {
          return res.json({
            outfits: [],
            message: "No items available for outfit generation. Please add more clothing items to your closet."
          });
        }
      }

      const tops = closetItems.filter(item => item.category === 'tops');
      const bottoms = closetItems.filter(item => item.category === 'bottoms');
      const shoes = closetItems.filter(item => item.category === 'shoes');
      const outerwear = closetItems.filter(item => item.category === 'outerwear');
      const accessories = closetItems.filter(item => item.category === 'accessories');

      // Check if we have the minimum required items to create outfits
      if (tops.length === 0 || bottoms.length === 0) {
        return res.json({
          outfits: [],
          message: "Your closet needs at least one top and one bottom to create outfits."
        });
      }

      // Create filters object for outfit generation
      const filters: any = {};
      if (style) filters.style = style;
      if (season) filters.season = season;
      if (themeId) filters.themeId = themeId;

      // Use the OpenAI utility to generate outfits
      const outfits = await generateOutfitCombinations(closetItems, filters);

      // Add unique IDs to each outfit for React keys
      const outfitsWithIds = outfits.map((outfit, index) => ({
        ...outfit,
        id: `outfit_${Date.now()}_${index}_${outfit.items?.join('_') || 'empty'}`
      }));

      // Local validation to enforce outfit composition rules
      const validatedOutfits = outfitsWithIds.filter((outfit: any) => {
        // Convert all item IDs to numbers and filter out null/undefined values
        const itemIds = outfit.items
          .filter((id: any) => id !== null && id !== undefined)
          .map((id: string | number) => typeof id === 'string' ? parseInt(id, 10) : id);

        // Check if outfit has exactly one top
        const hasTop = itemIds.some((id: number) => tops.some(top => top.id === id));

        // Check if outfit has exactly one bottom
        const hasBottom = itemIds.some((id: number) => bottoms.some(bottom => bottom.id === id));

        // exactly one pair of shoes
        const shoeCount = itemIds.filter((id: number) => shoes.some(shoe => shoe.id === id)).length;
        const hasValidShoes = shoeCount === 1; // Must have exactly 1 shoe

        // keep it only if it has a top, a bottom and exactly one pair of shoes
        const isValid = hasTop && hasBottom && hasValidShoes;

        return isValid;
      });

      if (validatedOutfits.length === 0) {
        return res.json({
          outfits: [],
          message: "No valid outfit combinations could be created. Please try a different filter or add more items to your closet."
        });
      }

      // Normalize outfits for consistent item ID comparison
      const normalizedOutfits = validatedOutfits.map((outfit: any) => ({
        ...outfit,
        // Ensure items are all strings for consistent comparison
        items: outfit.items.map((id: any) => String(id))
      }));

      // Remove duplicates
      const outfitSignatures = new Set<string>();
      const uniqueOutfits: any[] = [];

      normalizedOutfits.forEach(outfit => {
        // Create a key that's the sorted list of item IDs
        const signature = [...outfit.items].sort().join(',');

        if (!outfitSignatures.has(signature)) {
          outfitSignatures.add(signature);
          uniqueOutfits.push(outfit);
        }
      });

      // Limit to a reasonable number of outfits (maximum 3-4)
      const limitedOutfits = uniqueOutfits.slice(0, 4);

      res.json({
        outfits: limitedOutfits,
        count: limitedOutfits.length,
        totalGenerated: outfits.length,
        validCount: validatedOutfits.length,
        uniqueCount: uniqueOutfits.length
      });
    } catch (error) {
      console.error('Error generating outfits:', error);
      res.status(500).json({ message: 'Failed to generate outfits' });
    }
  });

  // outfits aren't saved anywhere, so there's nothing to look up by id
  app.get('/api/outfits/:id', (_req, res) => {
    res.status(404).json({ message: 'Outfit not found' });
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  // Password-protected admin endpoint to toggle coming soon mode
  app.post('/api/admindesh09/toggle-mode', (req: Request, res: Response) => {
    try {
      const { mode, password } = req.body;

      // Check admin password
      if (password !== '1234') {
        return res.status(401).json({ message: 'Invalid admin password' });
      }

      if (mode !== 'coming-soon' && mode !== 'app') {
        return res.status(400).json({ message: 'Invalid mode' });
      }

      process.env.SITE_MODE = mode;
      res.json({ mode, message: `Site mode set to ${mode}` });
    } catch (error) {
      console.error('Mode toggle error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Password-protected admin mode check
  app.post('/api/admindesh09/mode', (req: Request, res: Response) => {
    const { password } = req.body;

    // Check admin password
    if (password !== '1234') {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    const mode = process.env.SITE_MODE || 'app';
    res.json({ mode });
  });

  // Public mode check (no admin access)
  app.get('/api/admin/mode', (req: Request, res: Response) => {
    const mode = process.env.SITE_MODE || 'app';
    res.json({ mode });
  });

  const httpServer = createServer(app);
  return httpServer;
}
