import { Router } from "express";
import { outfitSeasons, outfitThemes, type OutfitsResponse } from "@shared/schema";
import { ownerId, requireOwner } from "../auth";
import { asyncHandler } from "../http";
import { suggestOutfits } from "../ai";
import { canMakeOutfits, itemsForSeason, validateOutfits } from "../outfits";
import * as storage from "../storage";
import { aiLimiter } from "./middleware";

export const outfitsRouter = Router();
outfitsRouter.use(requireOwner);

outfitsRouter.get(
  "/",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const season = outfitSeasons.find((s) => s.id === req.query.season)?.id;
    const theme = outfitThemes.find((t) => t.id === req.query.theme);

    const closet = itemsForSeason(await storage.getClothingItems(ownerId(req)), season);
    if (!canMakeOutfits(closet)) {
      const body: OutfitsResponse = {
        outfits: [],
        message: "Add at least one top and one bottom (or a dress) to your closet to get outfits.",
      };
      return res.json(body);
    }

    const suggestions = await suggestOutfits(closet, {
      season,
      themeDescription: theme ? `${theme.name} (${theme.description})` : undefined,
    });
    const outfits = validateOutfits(suggestions, closet, season);

    const body: OutfitsResponse = outfits.length
      ? { outfits }
      : { outfits, message: "Couldn't put together outfits with those filters. Try different ones." };
    res.json(body);
  }),
);
