import { ProductRecommendation, ShoppingRecommendationsResponse } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate shopping recommendations based on missing pieces or style matching
export async function generateShoppingRecommendations(
  searchQuery: string,
  category?: string,
  maxResults: number = 8
): Promise<ShoppingRecommendationsResponse> {
  try {
    // Use OpenAI to generate realistic product recommendations
    const prompt = `Generate ${maxResults} realistic product recommendations for someone looking for: "${searchQuery}"
    ${category ? `Category: ${category}` : ''}

    For each product, provide:
    - A realistic product title
    - Brand name (use real fashion brands)
    - Price in USD (realistic market prices)
    - Description (2-3 sentences)
    - Style tags (3-5 relevant tags)
    - Match score (0-100) based on how well it matches the search
    - Match reason (why this item is recommended)

    Return ONLY a JSON object with this structure:
    {
      "recommendations": [
        {
          "id": "unique-id",
          "title": "product title",
          "brand": "brand name",
          "price": 89.99,
          "currency": "USD",
          "description": "product description",
          "category": "clothing category",
          "styleTags": ["tag1", "tag2", "tag3"],
          "matchScore": 85,
          "matchReason": "why this matches"
        }
      ],
      "totalCount": ${maxResults},
      "searchQuery": "${searchQuery}"
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a fashion shopping assistant. Generate realistic product recommendations with real brands and market prices. Always return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    let recommendations: ShoppingRecommendationsResponse;
    try {
      // Clean the content and extract JSON
      let jsonString = content;

      // Remove markdown code blocks if present
      if (content.includes('```')) {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1];
        }
      }

      // Find the JSON object in the content
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      recommendations = JSON.parse(jsonString);

      // Validate the structure
      if (!recommendations.recommendations || !Array.isArray(recommendations.recommendations)) {
        throw new Error("Invalid recommendations structure");
      }
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      console.error("Parse error:", parseError);
      throw new Error("Invalid response format from AI");
    }

    // the ai can't give real photos or links, so use one stock photo and a google search
    recommendations.recommendations = recommendations.recommendations.map(product => ({
      ...product,
      imageUrl: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&q=80`,
      productUrl: `https://www.google.com/search?q=${encodeURIComponent(product.brand + ' ' + product.title)}`,
    }));

    return recommendations;
  } catch (error) {
    console.error("Error generating shopping recommendations:", error);

    throw error;
  }
}

// Generate shopping recommendations based on user's missing pieces
export async function generateMissingPieceRecommendations(
  missingPieces: string[],
  userStyle: string[] = []
): Promise<ShoppingRecommendationsResponse> {
  const searchQuery = missingPieces.join(", ");
  const styleContext = userStyle.length > 0 ? ` in ${userStyle.join(", ")} style` : "";

  return generateShoppingRecommendations(searchQuery + styleContext, undefined, 6);
}

// Generate shopping recommendations based on inspiration image analysis
export async function generateInspirationShoppingRecommendations(
  inspirationTags: string[],
  existingCloset: string[] = []
): Promise<ShoppingRecommendationsResponse> {
  const searchQuery = `items to complete this look: ${inspirationTags.join(", ")}`;
  const existingContext = existingCloset.length > 0 ? ` (user already has: ${existingCloset.join(", ")})` : "";

  return generateShoppingRecommendations(searchQuery + existingContext, undefined, 8);
}