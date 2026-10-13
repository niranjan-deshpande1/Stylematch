import type {
  ClothingItem,
  InspirationImage,
  MissingPiece,
  OutfitsResponse,
  PublicUser,
  SessionResponse,
  SiteMode,
  StyleMatchResponse,
} from "@shared/schema";
import { apiJson } from "./queryClient";

// Typed wrappers around every API endpoint the client uses.

// ---- Session ----

export const getSession = () => apiJson<SessionResponse>("GET", "/api/session");
export const startGuestSession = () => apiJson<SessionResponse>("POST", "/api/guest");
export const login = (body: { username: string; password: string }) =>
  apiJson<PublicUser>("POST", "/api/login", body);
export const register = (body: { email: string; username: string; password: string }) =>
  apiJson<PublicUser>("POST", "/api/register", body);
export const logout = () => apiJson<void>("POST", "/api/logout");

// ---- Closet ----

export const getClosetItems = (category?: string | null) =>
  apiJson<ClothingItem[]>("GET", category ? `/api/closet?category=${encodeURIComponent(category)}` : "/api/closet");

export const getClosetCounts = () => apiJson<Record<string, number>>("GET", "/api/closet/counts");

export function uploadClothingItem(file: File, category: string) {
  const form = new FormData();
  form.append("image", file);
  form.append("category", category);
  return apiJson<ClothingItem>("POST", "/api/closet", form);
}

export const analyzeClothingItem = (id: number) =>
  apiJson<ClothingItem>("POST", `/api/closet/${id}/analyze`);

export const deleteClothingItem = (id: number) => apiJson<void>("DELETE", `/api/closet/${id}`);

// ---- Inspiration ----

export const getInspirationImages = () => apiJson<InspirationImage[]>("GET", "/api/inspiration");
export const getInspirationImage = (id: number) =>
  apiJson<InspirationImage>("GET", `/api/inspiration/${id}`);

export function uploadInspirationImage(file: File) {
  const form = new FormData();
  form.append("image", file);
  return apiJson<InspirationImage>("POST", "/api/inspiration", form);
}

export const analyzeInspirationImage = (id: number) =>
  apiJson<InspirationImage>("POST", `/api/inspiration/${id}/analyze`);

export const toggleInspirationSaved = (id: number) =>
  apiJson<InspirationImage>("POST", `/api/inspiration/${id}/save`);

export const deleteInspirationImage = (id: number) =>
  apiJson<void>("DELETE", `/api/inspiration/${id}`);

export const getStyleMatch = (id: number) =>
  apiJson<StyleMatchResponse>("GET", `/api/inspiration/${id}/matching`);

export async function getMissingPieces(id: number) {
  const res = await apiJson<{ missingPieces: MissingPiece[] }>("GET", `/api/inspiration/${id}/missing-pieces`);
  return res.missingPieces;
}

// ---- Outfits ----

export function getOutfits(filters: { season?: string; theme?: string }) {
  const params = new URLSearchParams();
  if (filters.season) params.set("season", filters.season);
  if (filters.theme) params.set("theme", filters.theme);
  const query = params.toString();
  return apiJson<OutfitsResponse>("GET", query ? `/api/outfits?${query}` : "/api/outfits");
}

// ---- Site ----

export const getSiteMode = () => apiJson<{ mode: SiteMode }>("GET", "/api/site/mode");
export const joinWaitlist = (email: string) =>
  apiJson<{ message: string }>("POST", "/api/site/waitlist", { email });
export const getAdminSession = () => apiJson<{ isAdmin: boolean }>("GET", "/api/site/admin/session");
export const adminLogin = (password: string) =>
  apiJson<{ isAdmin: boolean }>("POST", "/api/site/admin/login", { password });
export const adminLogout = () => apiJson<{ isAdmin: boolean }>("POST", "/api/site/admin/logout");
export const setSiteMode = (mode: SiteMode) =>
  apiJson<{ mode: SiteMode }>("PUT", "/api/site/admin/mode", { mode });
