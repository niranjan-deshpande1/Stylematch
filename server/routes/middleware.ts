import multer from "multer";
import rateLimit from "express-rate-limit";
import { HttpError } from "../http";
import { SUPPORTED_IMAGE_TYPES } from "../images";

/** Accepts one image (field "image") up to 8 MB, kept in memory. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // A first check on the declared type. The file's actual bytes are checked in saveImage.
    if (SUPPORTED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, "Upload a JPEG, PNG, or WebP image"));
  },
}).single("image");

/**
 * AI calls cost money, so each IP address gets a modest budget per hour.
 * Keyed by IP rather than session, since a new guest session is free to make.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "You've hit the hourly limit for AI features. Try again later." },
});
