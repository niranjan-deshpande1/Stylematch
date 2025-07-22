import fs from 'fs';
import path from 'path';
import { analyzeClothingImage } from './openai';

export interface SwipeImage {
  id: number;
  image_url: string;
  style_tags: string[];
  filename: string;
}

const INSPIRATION_FOLDER = path.join(process.cwd(), 'swipe-inspiration-images');
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Cache for processed images to avoid re-processing
let processedImages: SwipeImage[] = [];
let lastProcessTime = 0;

/**
 * Check if a file is a supported image format
 */
function isSupportedImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Process a single image file with OpenAI Vision API
 */
async function processImageFile(filePath: string, filename: string, id: number): Promise<SwipeImage> {
  try {
    // Read image file as base64
    const buffer = await fs.promises.readFile(filePath);
    const base64Image = buffer.toString('base64');

    // Analyze with OpenAI
    const styleTags = await analyzeClothingImage(base64Image);

    return {
      id,
      image_url: `/api/swipe-inspiration/${filename}`,
      style_tags: styleTags,
      filename
    };
  } catch (error) {
    console.error(`Error processing ${filename}:`, error);

    // Return fallback with basic tags based on filename
    const fallbackTags = extractTagsFromFilename(filename);
    return {
      id,
      image_url: `/api/swipe-inspiration/${filename}`,
      style_tags: fallbackTags,
      filename
    };
  }
}

/**
 * Extract style tags from filename as fallback
 */
function extractTagsFromFilename(filename: string): string[] {
  const name = filename.toLowerCase();
  const tags: string[] = [];

  // Check for common style keywords in filename
  const styleMap: { [key: string]: string } = {
    'minimal': 'minimalist',
    'boho': 'bohemian',
    'street': 'streetwear',
    'classic': 'classic',
    'edgy': 'edgy',
    'grunge': 'grunge',
    'romantic': 'romantic',
    'vintage': 'vintage',
    'retro': 'vintage',
    'athleisure': 'athleisure',
    'sport': 'sporty',
    'formal': 'formal',
    'professional': 'professional',
    'tech': 'techwear',
    'casual': 'casual',
    'chic': 'chic',
    'preppy': 'preppy'
  };

  for (const [keyword, tag] of Object.entries(styleMap)) {
    if (name.includes(keyword)) {
      tags.push(tag);
    }
  }

  // Default fallback tags
  if (tags.length === 0) {
    tags.push('casual', 'everyday');
  }

  return tags;
}

/**
 * Process all images in the inspiration folder
 */
export async function processInspirationImages(): Promise<SwipeImage[]> {
  try {
    // Check if folder exists
    if (!fs.existsSync(INSPIRATION_FOLDER)) {
      fs.mkdirSync(INSPIRATION_FOLDER, { recursive: true });
      return [];
    }

    // Get folder modification time to check if we need to reprocess
    const folderStats = await fs.promises.stat(INSPIRATION_FOLDER);
    const folderModTime = folderStats.mtime.getTime();

    // Return cached results if folder hasn't changed and we have processed images
    if (processedImages.length > 0 && folderModTime <= lastProcessTime) {
      return processedImages;
    }

    // Read all files in the folder
    const files = await fs.promises.readdir(INSPIRATION_FOLDER);
    const imageFiles = files.filter(isSupportedImageFile);

    if (imageFiles.length === 0) {
      return [];
    }

    // Process images in parallel (but limit concurrency to avoid rate limits)
    const BATCH_SIZE = 3; // Process 3 images at a time
    const results: SwipeImage[] = [];

    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((filename, index) => {
        const filePath = path.join(INSPIRATION_FOLDER, filename);
        const id = i + index + 1;
        return processImageFile(filePath, filename, id);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be respectful of API limits
      if (i + BATCH_SIZE < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Cache results
    processedImages = results;
    lastProcessTime = Date.now();

    return results;
  } catch (error) {
    console.error('Error processing inspiration images:', error);
    return [];
  }
}

/**
 * Get processed images (from cache or process if needed)
 */
export async function getSwipeImages(): Promise<SwipeImage[]> {
  if (processedImages.length > 0) {
    return processedImages;
  }

  return await processInspirationImages();
}

/**
 * Force reprocess all images (useful for manual refresh)
 */
export async function reprocessInspirationImages(): Promise<SwipeImage[]> {
  processedImages = [];
  lastProcessTime = 0;
  return await processInspirationImages();
}