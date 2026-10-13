import { Router } from "express";
import { ownerId, requireOwner } from "../auth";
import { asyncHandler, HttpError, parseId } from "../http";
import { deleteImage, loadImage, saveImage } from "../images";
import { findMissingPieces, tagInspirationImage } from "../ai";
import { matchCloset } from "../outfits";
import * as storage from "../storage";
import { aiLimiter, imageUpload } from "./middleware";

export const inspirationRouter = Router();
inspirationRouter.use(requireOwner);

async function getOwnedImage(id: number, owner: number) {
  const image = await storage.getInspirationImage(id, owner);
  if (!image) throw new HttpError(404, "Inspiration image not found");
  return image;
}

inspirationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await storage.getInspirationImages(ownerId(req)));
  }),
);

inspirationRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getOwnedImage(parseId(req.params.id), ownerId(req)));
  }),
);

inspirationRouter.post(
  "/",
  imageUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No image was uploaded");
    const imageUrl = await saveImage(req.file.buffer);
    if (!imageUrl) throw new HttpError(400, "Upload a JPEG, PNG, or WebP image");
    const image = await storage.createInspirationImage({ ownerId: ownerId(req), imageUrl });
    res.status(201).json(image);
  }),
);

inspirationRouter.post(
  "/:id/analyze",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const owner = ownerId(req);
    const image = await getOwnedImage(parseId(req.params.id), owner);
    const file = await loadImage(image.imageUrl);
    if (!file) throw new HttpError(404, "The file for this image is missing");

    const styleTags = await tagInspirationImage(file);
    res.json(await storage.updateInspirationImage(image.id, owner, { styleTags }));
  }),
);

inspirationRouter.post(
  "/:id/save",
  asyncHandler(async (req, res) => {
    const owner = ownerId(req);
    const image = await getOwnedImage(parseId(req.params.id), owner);
    res.json(await storage.updateInspirationImage(image.id, owner, { isSaved: !image.isSaved }));
  }),
);

inspirationRouter.get(
  "/:id/matching",
  asyncHandler(async (req, res) => {
    const owner = ownerId(req);
    const image = await getOwnedImage(parseId(req.params.id), owner);
    if (!image.styleTags?.length) {
      throw new HttpError(409, "Analyze this image for style tags first");
    }
    const closet = await storage.getClothingItems(owner);
    res.json(matchCloset(image.styleTags, closet));
  }),
);

inspirationRouter.get(
  "/:id/missing-pieces",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const owner = ownerId(req);
    const image = await getOwnedImage(parseId(req.params.id), owner);
    // Saved answers are reused until the closet changes, so revisiting the page is free.
    if (image.missingPieces) return res.json({ missingPieces: image.missingPieces });

    const file = await loadImage(image.imageUrl);
    if (!file) throw new HttpError(404, "The file for this image is missing");

    const closet = await storage.getClothingItems(owner);
    const closetTags = [...new Set(closet.flatMap((item) => item.styleTags ?? []))];
    const missingPieces = await findMissingPieces(file, closetTags);
    await storage.updateInspirationImage(image.id, owner, { missingPieces });
    res.json({ missingPieces });
  }),
);

inspirationRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const deleted = await storage.deleteInspirationImage(parseId(req.params.id), ownerId(req));
    if (!deleted) throw new HttpError(404, "Inspiration image not found");
    await deleteImage(deleted.imageUrl);
    res.sendStatus(204);
  }),
);
