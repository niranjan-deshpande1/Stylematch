import OpenAI from "openai";
import type { MissingPiece } from "../../shared/schema";

// Using gpt-4o-mini which is more cost-effective than gpt-4o
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Helper function to handle nullish content
function parseOpenAIResponseContent(content: string | null): any {
  if (!content) return { tags: [] };
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("Error parsing OpenAI response:", e);
    return { tags: [] };
  }
}

// Check if OpenAI API key is valid
const isOpenAIConfigured = !!process.env.OPENAI_API_KEY;

// Fashion style definitions that can be updated by experts
const fashionStyleGuide = `
Fashion Style Definitions:

Fit & Silhouette:
- "Baggy": Significantly looser than standard fit, with excess fabric throughout. Provides a relaxed, oversized silhouette.
- "Balloon pants": Wide through the thigh and hip, then tapered at the ankle creating a balloon-like silhouette.
- "Tapered": Gradually narrowing from top to bottom, fitted at the ankle.
- "Slim fit": Narrow but not skin-tight, following body contours with minimal excess fabric.
- "Skinny": Very tight-fitting throughout, hugging body contours closely.
- "Oversized": Intentionally larger than standard sizing, creating a voluminous silhouette.
- "Cropped": Shorter than standard length, often ending above the ankle for pants or above the waist for tops.
- "Bootcut": Fitted through hip and thigh, slightly flared from knee to accommodate boots.
- "Straight leg": Consistent width from hip to ankle, creating a clean vertical line.
- "Flared": Fitted at hip and thigh, then widening from knee to hem.
- "A-line": Fitted at the top, gradually widening toward the bottom creating an 'A' shape.
- "Boxy": Square or rectangular silhouette with minimal tapering or shaping.
- "Wide-leg": Loose-fitting throughout the leg with a consistent width from thigh to ankle.
- "Mom jeans": High-waisted, slightly baggy through hip and thigh, often tapered at ankle, vintage-inspired.
- "Boyfriend": Loose-fitting throughout with a slouchy, borrowed-from-men's-closet appearance.
- "Relaxed fit": Moderately loose throughout without excess fabric, comfortable without appearing oversized.

Style Aesthetics:
- "Streetwear": Urban-inspired casual wear influenced by skateboarding and hip-hop culture.
- "Athleisure": Athletic-inspired clothing worn for everyday casual situations rather than sport.
- "Y2K": Resurrection of early 2000s fashion trends featuring low-rise pants, baby tees, bright colors.
- "Minimalist": Clean, simple designs with limited details and neutral color palettes.
- "Normcore": Deliberately ordinary, unpretentious clothing emphasizing simplicity and practicality.
- "Vintage": Clothing inspired by or resembling styles from previous decades.
- "Bohemian": Free-spirited style with natural fabrics, flowy silhouettes, and eclectic patterns.
- "Preppy": Clean-cut, traditional style derived from northeastern US prep school uniforms.
- "Grunge": Inspired by 90s Seattle music scene with plaid flannel, distressed denim, and slouchy fits.
- "Goth": Dark, dramatic style with black clothing, Victorian influences, and edgy accessories.
- "Cottage-core": Romanticized rural aesthetic with floral prints, natural textiles, and vintage elements.
- "Dark Academia": Inspired by classic literature and education aesthetics with tweed, plaid, and muted colors.
`;

/**
 * Analyzes a clothing image and returns style tags
 * @param base64Image Base64 encoded image
 * @returns Array of style tags
 */
export async function analyzeClothingImage(base64Image: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `You are a fashion expert AI that analyzes clothing images. Use the following expert-provided style definitions when analyzing fits and styles:

            ${fashionStyleGuide}

            Identify specific style elements like colors, patterns, fit, and clothing type. Be precise with fit terminology based on the definitions above. Respond with a JSON object containing an array of tags. Keep tags concise (1-3 words). Example tags: 'red sweater', 'floral pattern', 'slim fit', 'casual', 'v-neck', 'balloon pants', etc. Only return JSON in the format: { 'tags': ['tag1', 'tag2', ...] }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this clothing item and provide style tags following the expert style definitions."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const result = parseOpenAIResponseContent(response.choices[0].message.content);
    return result.tags || [];
  } catch (error: any) {
    console.error("Error analyzing clothing image:", error);

    // Check for rate limit or quota errors
    if (error.status === 429 || (error.error && error.error.type === 'insufficient_quota')) {
      throw new Error("AI service quota exceeded. Please try again later or contact support to upgrade your plan.");
    }

    throw new Error("Failed to analyze clothing image");
  }
}

/**
 * Analyzes an outfit/inspiration image and returns style tags
 * @param base64Image Base64 encoded image
 * @returns Array of style tags
 */
export async function analyzeOutfitImage(base64Image: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `You are a fashion expert AI that analyzes outfit inspiration images. Use the following expert-provided style definitions when analyzing fits and styles:

            ${fashionStyleGuide}

            Identify the overall style, individual clothing items, colors, patterns, and aesthetic. Be precise with fit terminology based on the definitions above. Respond with a JSON object containing an array of tags. Keep tags concise (1-3 words). Example tags: 'streetwear', 'minimalist', 'layered look', 'monochrome', 'business casual', 'vintage', 'black boots', 'balloon pants', etc. Only return JSON in the format: { 'tags': ['tag1', 'tag2', ...] }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this outfit inspiration and provide style tags following the expert style definitions."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const result = parseOpenAIResponseContent(response.choices[0].message.content);
    return result.tags || [];
  } catch (error: any) {
    console.error("Error analyzing outfit image:", error);

    // Check for rate limit or quota errors
    if (error.status === 429 || (error.error && error.error.type === 'insufficient_quota')) {
      throw new Error("AI service quota exceeded. Please try again later or contact support to upgrade your plan.");
    }

    throw new Error("Failed to analyze outfit image");
  }
}

// Using MissingPiece from shared schema

/**
 * Analyzes an inspiration image and user's closet to identify missing pieces
 * @param base64Image Base64 encoded inspiration image
 * @param userClosetTags Style tags from the items already in the user's closet
 * @returns Array of missing piece recommendations
 */
export async function identifyMissingPieces(
  base64Image: string,
  userClosetTags: string[]
): Promise<MissingPiece[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `You are a fashion expert AI that identifies missing wardrobe pieces. Given an inspiration outfit image and a list of style tags describing items the user already owns, recommend the specific pieces they'd need to buy to recreate the look. For each missing piece, include a category, a short description, an importance level ("high", "medium", or "low"), a one-sentence reason it's needed, 1-2 concrete product examples with a name and approximate price range, a few search terms someone could use to shop for it, and a general suggestion of where to buy it. Only return JSON in the format: { "missingPieces": [{ "category": string, "description": string, "importance": "high" | "medium" | "low", "reason": string, "examples": [{ "name": string, "description": string, "where": string, "price": string }], "searchTerms": string[], "wheretoBuy": string }] }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this inspirational outfit image and recommend missing pieces that would help the user recreate similar looks. The user already has items with these style tags: ${userClosetTags.join(", ")}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = parseOpenAIResponseContent(response.choices[0].message.content);
    return result.missingPieces || [];
  } catch (error: any) {
    console.error("Error identifying missing pieces:", error);

    // Check for rate limit or quota errors
    if (error.status === 429 || (error.error && error.error.type === 'insufficient_quota')) {
      throw new Error("AI service quota exceeded. Please try again later or contact support to upgrade your plan.");
    }

    throw new Error("Failed to identify missing pieces");
  }
}

/**
 * Generate outfit combinations based on clothing items in user's closet
 * @param clothingItems Array of clothing items
 * @param filters Optional filters (style, season, theme)
 * @returns Array of outfit combinations
 */
export async function generateOutfitCombinations(
  clothingItems: any[],
  filters?: {
    style?: string;
    season?: string;
    themeId?: string;
  }
): Promise<any[]> {
  if (!isOpenAIConfigured) {
    throw new Error("OpenAI API key is required for outfit generation. Please configure it in the environment settings.");
  }

  try {
    const tops = clothingItems.filter(item => item.category === 'tops');
    const bottoms = clothingItems.filter(item => item.category === 'bottoms');
    const shoes = clothingItems.filter(item => item.category === 'shoes');

    // only send what the model needs
    const itemDescriptions = clothingItems.map(item => ({
      id: item.id,
      category: item.category,
      styleTags: item.styleTags || []
    }));

    const filterDescription = [];
    if (filters?.style) filterDescription.push(`Style: ${filters.style}`);
    if (filters?.season) filterDescription.push(`Season: ${filters.season}`);
    if (filters?.themeId) filterDescription.push(`Theme: ${filters.themeId}`);

    const prompt = `
    Put together outfits from this closet. Each item has an id, a category and style tags:
    ${JSON.stringify(itemDescriptions, null, 2)}

    The closet has ${tops.length} tops, ${bottoms.length} bottoms and ${shoes.length} pairs of shoes.
    ${filterDescription.length > 0 ? 'Filters:\n' + filterDescription.join('\n') : 'No filters.'}

    Rules:
    - each outfit has one top and one bottom
    - add one pair of shoes if there are any
    - follow the filters above
    - don't repeat the exact same set of items
    - make up to 8 outfits, fewer is fine if the closet is small

    For each outfit return a name, a short description, the item ids as numbers, a style, an occasion and a season.
    Respond with JSON only: { "outfits": [{ "name": string, "description": string, "items": number[], "style": string, "occasion": string, "season": string }] }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a stylist putting together outfits from someone's closet."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    let data;
    try {
      data = JSON.parse(response.choices[0].message.content);
      // sometimes the model returns a bare array
      if (!data.outfits && Array.isArray(data)) {
        data = { outfits: data };
      }
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      return [];
    }

    const outfits = data.outfits || [];

    // drop exact duplicates
    const uniqueOutfits = [];
    const seenCombinations = new Set();

    for (const outfit of outfits) {
      outfit.items = outfit.items.map((id: any) => typeof id === 'string' ? parseInt(id, 10) : id);
      const signature = [...outfit.items].sort().join(',');
      if (!seenCombinations.has(signature)) {
        seenCombinations.add(signature);
        uniqueOutfits.push(outfit);
      }
    }

    uniqueOutfits.forEach(outfit => {
      if (filters?.style) outfit.style = filters.style;
      if (filters?.themeId) {
        outfit.style = filters.themeId;
        if (!outfit.name.toLowerCase().includes(filters.themeId.toLowerCase())) {
          outfit.name = `${filters.themeId} ${outfit.name}`;
        }
      }
      if (filters?.season) outfit.season = filters.season;
    });

    return uniqueOutfits;
  } catch (error: any) {
    console.error("Error generating outfit combinations:", error);

    // Check if this is a quota or rate limit error
    if (error.status === 429 || (error.error && error.error.type === 'insufficient_quota')) {
      throw new Error("AI service quota exceeded. Please try again later or contact support to upgrade your plan.");
    }

    throw new Error("Failed to generate outfit combinations");
  }
}
