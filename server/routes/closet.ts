import { Router } from "express";
import { clothingCategories } from "@shared/schema";
import { ownerId, requireOwner } from "../auth";
import { asyncHandler, HttpError, parseId } from "../http";
import { deleteImage, loadImage, saveImage } from "../images";
import { tagClothingItem } from "../ai";
import * as storage from "../storage";
import { aiLimiter, imageUpload } from "./middleware";

export const closetRouter = Router();
closetRouter.use(requireOwner);

function isCategory(value: unknown): value is (typeof clothingCategories)[number] {
  return typeof value === "string" && (clothingCategories as readonly string[]).includes(value);
}

closetRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const category = isCategory(req.query.category) ? req.query.category : undefined;
    res.json(await storage.getClothingItems(ownerId(req), category));
  }),
);

closetRouter.get(
  "/counts",
  asyncHandler(async (req, res) => {
    const counts = await storage.countItemsByCategory(ownerId(req));
    const all = Object.values(counts).reduce((sum, n) => sum + n, 0);
    res.json({ ...counts, all });
  }),
);

closetRouter.post(
  "/",
  imageUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No image was uploaded");
    const category = req.body.category ?? "other";
    if (!isCategory(category)) throw new HttpError(400, "Unknown category");

    const imageUrl = await saveImage(req.file.buffer);
    if (!imageUrl) throw new HttpError(400, "Upload a JPEG, PNG, or WebP image");
    const item = await storage.createClothingItem({ ownerId: ownerId(req), imageUrl, category });
    res.status(201).json(item);
  }),
);

closetRouter.post(
  "/:id/analyze",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const owner = ownerId(req);
    const id = parseId(req.params.id);
    const item = await storage.getClothingItem(id, owner);
    if (!item) throw new HttpError(404, "Item not found");

    const image = await loadImage(item.imageUrl);
    if (!image) throw new HttpError(404, "The image for this item is missing");

    const tags = await tagClothingItem(image);
    const updated = await storage.setClothingItemTags(id, owner, tags);
    await storage.clearMissingPieces(owner);
    res.json(updated);
  }),
);

closetRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const owner = ownerId(req);
    const deleted = await storage.deleteClothingItem(parseId(req.params.id), owner);
    if (!deleted) throw new HttpError(404, "Item not found");
    await deleteImage(deleted.imageUrl);
    await storage.clearMissingPieces(owner);
    res.sendStatus(204);
  }),
);
