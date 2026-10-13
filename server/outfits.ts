import type { ClothingItem, Outfit, StyleMatchResponse } from "@shared/schema";
import type { SuggestedOutfit } from "./ai";

export const MAX_OUTFITS = 4;

const ONE_PIECE = new Set(["dresses", "suits"]);

function isShorts(item: ClothingItem): boolean {
  return (item.styleTags ?? []).some((tag) => tag.toLowerCase().includes("shorts"));
}

/**
 * Narrows the closet before it goes to the model. Right now the only hard rule
 * is seasonal: no shorts in fall or winter.
 */
export function itemsForSeason(items: ClothingItem[], season?: string): ClothingItem[] {
  if (season !== "fall" && season !== "winter") return items;
  return items.filter((item) => !(item.category === "bottoms" && isShorts(item)));
}

/** A closet can produce outfits if it has a top and a bottom, or a dress/suit. */
export function canMakeOutfits(items: ClothingItem[]): boolean {
  const has = (category: string) => items.some((i) => i.category === category);
  return (has("tops") && has("bottoms")) || items.some((i) => ONE_PIECE.has(i.category));
}

/**
 * The model doesn't always follow the rules in the prompt, so every suggestion
 * is checked here. Anything that references unknown items, has the wrong mix of
 * pieces, or repeats a top+bottom pair is dropped.
 */
export function validateOutfits(
  suggestions: SuggestedOutfit[],
  closet: ClothingItem[],
  season?: string,
): Outfit[] {
  const byId = new Map(closet.map((item) => [item.id, item]));
  const closetHasShoes = closet.some((i) => i.category === "shoes");
  const seenBases = new Set<string>();
  const valid: Outfit[] = [];

  for (const suggestion of suggestions) {
    const ids = [...new Set(suggestion.items)];
    const items = ids.flatMap((id) => byId.get(id) ?? []);
    if (items.length === 0 || items.length !== ids.length) continue;

    const count = (category: string) => items.filter((i) => i.category === category).length;
    const tops = count("tops");
    const bottoms = count("bottoms");
    const onePieces = items.filter((i) => ONE_PIECE.has(i.category)).length;
    const shoes = count("shoes");

    const separates = tops === 1 && bottoms === 1 && onePieces === 0;
    const onePiece = onePieces === 1 && tops === 0 && bottoms === 0;
    if (!separates && !onePiece) continue;
    if (shoes > 1 || (closetHasShoes && shoes === 0)) continue;

    const base = items
      .filter((i) => i.category === "tops" || i.category === "bottoms" || ONE_PIECE.has(i.category))
      .map((i) => i.id)
      .sort((a, b) => a - b)
      .join("+");
    if (seenBases.has(base)) continue;
    seenBases.add(base);

    valid.push({
      id: ids.slice().sort((a, b) => a - b).join("-"),
      name: suggestion.name,
      description: suggestion.description,
      items: ids,
      style: suggestion.style ?? "",
      occasion: suggestion.occasion ?? "",
      season: season && season !== "all-season" ? season : "any season",
    });
    if (valid.length === MAX_OUTFITS) break;
  }

  return valid;
}

function normalize(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * Scores how much of an inspiration look the closet already covers: the share
 * of the inspiration's tags that appear on at least one closet item.
 */
export function matchCloset(inspirationTags: string[], closet: ClothingItem[]): StyleMatchResponse {
  const wanted = [...new Set(inspirationTags.map(normalize))];
  const covered = new Set<string>();
  const matchingItems: number[] = [];

  for (const item of closet) {
    const itemTags = new Set((item.styleTags ?? []).map(normalize));
    const shared = wanted.filter((tag) => itemTags.has(tag));
    if (shared.length > 0) {
      matchingItems.push(item.id);
      shared.forEach((tag) => covered.add(tag));
    }
  }

  return {
    matchingItems,
    matchScore: wanted.length === 0 ? 0 : Math.round((covered.size / wanted.length) * 100),
    coveredTags: wanted.filter((tag) => covered.has(tag)),
    missingTags: wanted.filter((tag) => !covered.has(tag)),
  };
}
