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
  StyleMatchingResponse
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
  // Set up authentication
  setupAuth(app);

  // Serve uploaded images
  app.get('/api/images/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);
    res.sendFile(filepath);
  });

  // Get all inspiration images
  app.get('/api/inspiration', async (_req, res) => {
    try {
      const images = await storage.getInspirationImages();
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch inspiration images' });
    }
  });

  // Helper to get user ID from request
  const getUserId = (req: Request): number | null => {
    // Check if the user is logged in or if they're in guest mode
    if (req.user?.id) {
      return req.user.id;
    } else if (req.headers['x-guest-mode'] === 'true' || req.query.guestMode === 'true') {
      // For guest users, we'll use a special ID (1)
      return 1;
    }
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
      const image = await storage.getInspirationImage(id);

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
      const image = await storage.getInspirationImage(id);

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
      const image = await storage.getInspirationImage(id);

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

      let items;
      if (category && clothingCategories.includes(category as any)) {
        items = await storage.getClothingItemsByCategory(category);
      } else {
        items = await storage.getClothingItems();
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
        userId
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
      const item = await storage.getClothingItem(id);

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
      const item = await storage.getClothingItem(id);

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
      const image = await storage.getInspirationImage(id);

      if (!image) {
        return res.status(404).json({ message: 'Inspiration image not found' });
      }

      // Get image file path from URL
      const filename = path.basename(image.imageUrl);
      const filepath = path.join(uploadDir, filename);

      // Read image file as base64
      const buffer = await fs.promises.readFile(filepath);
      const base64Image = buffer.toString('base64');

      // Get all clothing items to build a profile of user's closet
      const clothingItems = await storage.getClothingItems();
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
  app.get('/api/categories', async (_req, res) => {
    try {
      const items = await storage.getClothingItems();

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
      const image = await storage.getInspirationImage(id);

      if (!image) {
        return res.status(404).json({ message: 'Inspiration image not found' });
      }

      if (!image.styleTags || image.styleTags.length === 0) {
        return res.status(400).json({ message: 'Inspiration image has no style tags. Analyze it first.' });
      }

      // Get all clothing items
      const clothingItems = await storage.getClothingItems();

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

      // Get all clothing items from the storage
      const closetItems = await storage.getClothingItems();
      if (closetItems.length === 0) {
        return res.json({ outfits: [] });
      }

      const tops = closetItems.filter(item => item.category === 'tops');
      const bottoms = closetItems.filter(item => item.category === 'bottoms');
      const shoes = closetItems.filter(item => item.category === 'shoes');

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

      // Local validation to enforce outfit composition rules
      const validatedOutfits = outfits.filter((outfit: any) => {
        // Convert all item IDs to numbers for consistency
        const itemIds = outfit.items.map((id: string | number) => typeof id === 'string' ? parseInt(id, 10) : id);

        // Check if outfit has exactly one top
        const hasTop = itemIds.some((id: number) => tops.some(top => top.id === id));

        // Check if outfit has exactly one bottom
        const hasBottom = itemIds.some((id: number) => bottoms.some(bottom => bottom.id === id));

        // Check if outfit has exactly one shoe (required if shoes are available)
        const hasShoe = shoes.length > 0 ?
          itemIds.some((id: number) => shoes.some(shoe => shoe.id === id)) :
          true; // Skip shoe check if no shoes in closet

        // Return true only if outfit meets all requirements
        return hasTop && hasBottom && hasShoe;
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

  const httpServer = createServer(app);
  return httpServer;
}
