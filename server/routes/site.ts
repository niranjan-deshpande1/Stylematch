import crypto from "crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { siteModes, type SiteMode } from "@shared/schema";
import { asyncHandler, HttpError } from "../http";
import * as storage from "../storage";

// Coming-soon mode swaps the whole app for a waitlist page. An admin can flip
// it from /admin. The admin password comes from ADMIN_PASSWORD; if that isn't
// set, admin login is disabled.

export const siteRouter = Router();

const SITE_MODE_KEY = "site_mode";

async function getSiteMode(): Promise<SiteMode> {
  const stored = await storage.getSetting(SITE_MODE_KEY);
  if (stored === "app" || stored === "coming-soon") return stored;
  return process.env.SITE_MODE === "coming-soon" ? "coming-soon" : "app";
}

function passwordMatches(input: string, expected: string): boolean {
  // Hash both sides so the comparison is constant-time regardless of length.
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.isAdmin) return next(new HttpError(401, "Admin login required"));
  next();
}

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again later." },
});

siteRouter.get(
  "/mode",
  asyncHandler(async (_req, res) => {
    res.json({ mode: await getSiteMode() });
  }),
);

siteRouter.post(
  "/waitlist",
  asyncHandler(async (req, res) => {
    const parsed = z.string().trim().toLowerCase().email().safeParse(req.body?.email);
    if (!parsed.success) throw new HttpError(400, "Enter a valid email address");

    const added = await storage.addToWaitlist(parsed.data);
    res.json({
      message: added
        ? "You're on the waitlist. We'll email you when we launch."
        : "You're already on the waitlist. We'll be in touch.",
    });
  }),
);

siteRouter.get("/admin/session", (req, res) => {
  res.json({ isAdmin: Boolean(req.session.isAdmin) });
});

siteRouter.post("/admin/login", adminLoginLimiter, (req, res, next) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return next(new HttpError(404, "Admin is disabled"));

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!passwordMatches(password, expected)) return next(new HttpError(401, "Wrong password"));

  req.session.isAdmin = true;
  res.json({ isAdmin: true });
});

siteRouter.post("/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  res.json({ isAdmin: false });
});

siteRouter.put(
  "/admin/mode",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const mode = req.body?.mode;
    if (!siteModes.includes(mode)) throw new HttpError(400, "Unknown mode");
    await storage.setSetting(SITE_MODE_KEY, mode);
    res.json({ mode });
  }),
);
