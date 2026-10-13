import type { ClothingItem } from "@shared/schema";

// Definitions the model uses when tagging fit and style, so tags stay
// consistent (e.g. "balloon pants" vs "tapered" vs "wide-leg").
const STYLE_GUIDE = `
Fit & silhouette:
- Baggy: significantly looser than standard fit, with excess fabric throughout.
- Balloon pants: wide through the thigh and hip, tapered at the ankle.
- Tapered: gradually narrowing from top to bottom, fitted at the ankle.
- Slim fit: narrow but not skin-tight, minimal excess fabric.
- Skinny: tight-fitting throughout, hugging the body.
- Oversized: intentionally larger than standard sizing.
- Cropped: shorter than standard length (above the ankle, or above the waist for tops).
- Bootcut: fitted through hip and thigh, slightly flared from the knee.
- Straight leg: consistent width from hip to ankle.
- Flared: fitted at hip and thigh, widening from the knee to the hem.
- A-line: fitted at the top, widening toward the bottom.
- Boxy: square silhouette with little shaping.
- Wide-leg: loose throughout the leg with consistent width.
- Mom jeans: high-waisted, slightly baggy through hip and thigh, tapered at the ankle.
- Boyfriend: loose and slouchy, borrowed-from-men's-closet look.
- Relaxed fit: moderately loose without looking oversized.

Aesthetics:
- Streetwear: urban casual wear rooted in skate and hip-hop culture.
- Athleisure: athletic clothing worn for everyday casual wear.
- Y2K: early-2000s trends like low-rise pants, baby tees, bright colors.
- Minimalist: clean, simple designs with neutral palettes.
- Normcore: deliberately ordinary, practical clothing.
- Vintage: styles from, or inspired by, earlier decades.
- Bohemian: natural fabrics, flowy silhouettes, eclectic patterns.
- Preppy: clean-cut style from US prep school uniforms.
- Grunge: 90s Seattle look with flannel, distressed denim, slouchy fits.
- Goth: dark, dramatic clothing with Victorian influences.
- Cottagecore: romantic rural look with florals and natural textiles.
- Dark academia: tweed, plaid, and muted colors inspired by classic literature.
`.trim();

const TAG_FORMAT = `Respond with JSON only, in the form {"tags": ["tag", ...]}. Keep each tag to 1-3 lowercase words.`;

export const CLOTHING_TAGGER = `You tag photos of individual clothing items for a wardrobe app.
Describe the item's type, main colors, pattern, fit, and the styles it suits. Use the fit and style terms from this guide when they apply:

${STYLE_GUIDE}

Aim for 6-10 tags, for example "black hoodie", "oversized", "streetwear", "fall". ${TAG_FORMAT}`;

export const OUTFIT_TAGGER = `You tag photos of full outfits that users want to recreate.
Describe the overall aesthetic, each visible garment, colors, and fit. Use the fit and style terms from this guide when they apply:

${STYLE_GUIDE}

Aim for 8-12 tags, for example "minimalist", "white sneakers", "wide-leg jeans", "monochrome". ${TAG_FORMAT}`;

export function missingPiecesPrompt(closetTags: string[]): string {
  const closet = closetTags.length > 0 ? closetTags.join(", ") : "(the closet is empty)";
  return `A user wants to recreate the outfit in this photo. Their closet already contains items tagged: ${closet}.

List the pieces they would still need to buy. Skip anything their closet already covers. For each piece give:
- category (tops, bottoms, outerwear, shoes, accessories, dresses, or suits)
- description: a short name for the piece
- importance: "high" if the look doesn't work without it, "medium" or "low" otherwise
- reason: one sentence on why it matters to the look
- searchTerms: 3-5 phrases to shop for it
- whereToBuy: the kinds of stores that usually carry it

Respond with JSON only: {"missingPieces": [...]}. Return an empty list if the closet already covers the look.`;
}

export function outfitPrompt(
  items: ClothingItem[],
  options: { season?: string; themeDescription?: string },
): string {
  const lines = items.map(
    (item) => `- id ${item.id} (${item.category}): ${(item.styleTags ?? []).join(", ") || "no tags"}`,
  );
  const goals = [
    options.season && options.season !== "all-season" ? `suited to ${options.season}` : null,
    options.themeDescription ? `with a ${options.themeDescription} feel` : null,
  ].filter(Boolean);

  return `Here is a user's closet:
${lines.join("\n")}

Put together up to 4 outfits using only these items${goals.length ? `, ${goals.join(" and ")}` : ""}.

Rules:
- Each outfit is either one top plus one bottom, or a single dress or suit.
- Add exactly one pair of shoes to every outfit if the closet has any shoes.
- Outerwear and accessories are optional. Use them when they make the look better.
- Don't repeat the same top and bottom pair across outfits.
- Only use ids from the list above.

Respond with JSON only:
{"outfits": [{"name": string, "description": string, "items": [id, ...], "style": string, "occasion": string}]}`;
}
