import { Router } from "express";
import { getOwnerId } from "../auth";
import { asyncHandler, HttpError } from "../http";
import { contentTypeForKey, isValidKey, loadImage } from "../images";
import * as storage from "../storage";

export const imagesRouter = Router();

// Serves an uploaded photo, but only to the person who uploaded it.
imagesRouter.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    const owner = getOwnerId(req);
    if (!isValidKey(key) || owner === null) throw new HttpError(404, "Not found");

    const imageUrl = `/api/images/${key}`;
    if (!(await storage.ownsImage(owner, imageUrl))) throw new HttpError(404, "Not found");

    const image = await loadImage(imageUrl);
    if (!image) throw new HttpError(404, "Not found");

    res.set({
      "Content-Type": contentTypeForKey(key),
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(image.data);
  }),
);
