import { apiRequest, setGuestModeHeader } from "./queryClient";
import type {
  InspirationImage,
  ClothingItem,
  StyleTagsResponse,
  MissingPiece,
  MissingPiecesResponse,
  OutfitCombination,
  OutfitCombinationsResponse,
  StyleMatchingResponse
} from "@shared/schema";

// Helper function to enable/disable guest mode
export function setGuestMode(enable: boolean) {
  if (typeof window !== 'undefined') {
    // Store guest mode state in both storage types for better reliability
    localStorage.setItem('guestMode', enable ? 'true' : 'false');
    sessionStorage.setItem('guestMode', enable ? 'true' : 'false');

    // Update request headers
    setGuestModeHeader(enable);
  }
}

// Helper to check if guest mode is enabled
export function isGuestMode(): boolean {
  if (typeof window === 'undefined') return false;

  // Check both storage types, preferring sessionStorage
  const sessionValue = sessionStorage.getItem('guestMode');
  const localValue = localStorage.getItem('guestMode');

  return sessionValue === 'true' || localValue === 'true';
}

// Get all clothing items
export async function getClothingItems(): Promise<ClothingItem[]> {
  const res = await apiRequest("GET", "/api/closet");
  return res.json();
}

// Upload an inspiration image
export async function uploadInspirationImage(file: File): Promise<InspirationImage> {
  const formData = new FormData();
  formData.append("image", file);

  // Add guest mode header if in guest mode
  const headers: HeadersInit = {};
  if (isGuestMode()) {
    headers['X-Guest-Mode'] = 'true';
  }

  const response = await fetch("/api/inspiration", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text || response.statusText}`);
  }

  return response.json();
}

// Analyze an inspiration image with AI
export async function analyzeInspirationImage(id: number): Promise<InspirationImage> {
  const res = await apiRequest("POST", `/api/inspiration/${id}/analyze`);
  return res.json();
}

// Upload a clothing item
export async function uploadClothingItem(file: File, category: string): Promise<ClothingItem> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("category", category);

  // Add guest mode header if in guest mode
  const headers: HeadersInit = {};
  if (isGuestMode()) {
    headers['X-Guest-Mode'] = 'true';
  }

  const response = await fetch("/api/closet", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text || response.statusText}`);
  }

  return response.json();
}

// Analyze a clothing item with AI
export async function analyzeClothingItem(id: number): Promise<ClothingItem> {
  const res = await apiRequest("POST", `/api/closet/${id}/analyze`);
  return res.json();
}

// Delete a clothing item
export async function deleteClothingItem(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/closet/${id}`);
}

// Delete an inspiration image
export async function deleteInspirationImage(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/inspiration/${id}`);
}

// Get missing pieces recommendations based on an inspiration image
export async function getMissingPieceRecommendations(inspirationId: number): Promise<MissingPiece[]> {
  const res = await apiRequest("GET", `/api/inspiration/${inspirationId}/missing-pieces`);
  const data = await res.json() as MissingPiecesResponse;
  return data.missingPieces;
}

// Get style matching between inspiration and closet items
export async function getStyleMatching(inspirationId: number): Promise<StyleMatchingResponse> {
  const res = await apiRequest("GET", `/api/inspiration/${inspirationId}/matching`);
  return res.json();
}

// Get outfit combination suggestions based on closet items
export async function getOutfitCombinations(options?: {
  style?: string;
  season?: string;
  themeId?: string;
}): Promise<OutfitCombination[]> {
  let url = '/api/outfits';

  if (options) {
    const params = new URLSearchParams();
    if (options.style && options.style.trim() !== '') params.append('style', options.style);
    if (options.season && options.season.trim() !== '') params.append('season', options.season);
    if (options.themeId && options.themeId.trim() !== '') params.append('themeId', options.themeId);

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const res = await apiRequest("GET", url);
  const data = await res.json() as OutfitCombinationsResponse;
  return data.outfits;
}

// Share outfit to social media
export async function shareOutfitToSocial(
  outfitId: string,
  platform: 'instagram' | 'snapchat' | 'twitter' | 'facebook'
): Promise<{ shareUrl: string }> {
  try {
    const res = await apiRequest("POST", `/api/outfits/${outfitId}/share`, {
      platform
    });

    if (!res.ok) {
      throw new Error(`Failed to share outfit: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error in shareOutfitToSocial:", error);
    throw error;
  }
}

// Get a specific outfit by ID
export async function getOutfit(outfitId: string): Promise<OutfitCombination> {
  const res = await apiRequest("GET", `/api/outfits/${outfitId}`);
  return res.json();
}

// Create a shareable image for an outfit
export async function createOutfitShareableImage(
  outfitId: string,
  options: {
    background?: string; // color hex code
    template?: string; // template style
    caption?: string;
  }
): Promise<{ imageUrl: string, shareUrl: string }> {
  const res = await apiRequest("POST", `/api/outfits/${outfitId}/create-share-image`, options);
  return res.json();
}
