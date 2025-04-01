import OpenAI from "openai";
import type { MissingPiece } from "../../shared/schema";

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
      model: "gpt-4o",
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
      model: "gpt-4o",
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
 * @param userClothingTags Array of tags from user's existing clothing items
 * @returns Array of missing piece recommendations
 */
export async function identifyMissingPieces(
  base64Image: string,
  userClothingTags: string[]
): Promise<MissingPiece[]> {
  try {
    // First, flatten all user clothing tags into a single string
    const userClosetDescription = userClothingTags.join(", ");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            `You are a fashion expert AI that helps users complete their outfits by recommending missing pieces. Use the following expert-provided style definitions:

            ${fashionStyleGuide}

            Analyze the inspiration image and compare it with the user's existing closet. Identify 2-3 key items that would help complete outfits similar to the inspiration. Focus on versatile pieces that would work well with their existing wardrobe.

            For each recommendation:
            1. Provide a specific category (tops, bottoms, outerwear, shoes, accessories)
            2. Give a detailed description
            3. Assign importance (high/medium/low)
            4. Explain why this item would enhance their wardrobe

            Respond with JSON in the format:
            { "missingPieces": [
              {"category": "category", "description": "description", "importance": "high|medium|low", "reason": "reason"},
              ...
            ]}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this inspiration image and suggest missing pieces to complete similar outfits. Here are the items already in my closet: ${userClosetDescription}`
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
      max_tokens: 600,
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