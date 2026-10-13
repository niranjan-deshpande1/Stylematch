import crypto from "crypto";
import { promisify } from "util";
import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { PublicUser, SessionResponse, User as DbUser } from "@shared/schema";
import { pool } from "./db";
import * as storage from "./storage";
import { asyncHandler, HttpError } from "./http";

declare global {
  namespace Express {
    interface User extends DbUser {}
  }
}

declare module "express-session" {
  interface SessionData {
    guestId?: number;
    isAdmin?: boolean;
  }
}

// ---- Passwords --------------------------------------------------------------

const scrypt = promisify(crypto.scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

// Stored as "<hash hex>.<salt hex>".
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${hash.toString("hex")}.${salt}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [hashHex, salt] = stored.split(".");
  if (!hashHex || !salt) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// ---- Helpers used by the routes ------------------------------------------------

function toPublicUser(user: DbUser): PublicUser {
  const { password: _password, ...rest } = user;
  return rest;
}

/**
 * The id that owns closet items and inspiration images for this request:
 * the user's id when signed in, the session's guest id otherwise.
 */
export function getOwnerId(req: Request): number | null {
  if (req.user) return req.user.id;
  return req.session.guestId ?? null;
}

/** Rejects the request unless it comes from a signed-in user or a guest session. */
export function requireOwner(req: Request, _res: Response, next: NextFunction) {
  if (getOwnerId(req) === null) {
    return next(new HttpError(401, "Sign in or continue as a guest first"));
  }
  next();
}

export function ownerId(req: Request): number {
  const id = getOwnerId(req);
  if (id === null) throw new HttpError(401, "Sign in or continue as a guest first");
  return id;
}

function newGuestId(): number {
  // Negative so it can never collide with a serial user id.
  return -crypto.randomInt(1, 2 ** 31 - 1);
}

/** Logs the user in, and moves over anything they made as a guest. */
function logIn(req: Request, user: DbUser): Promise<void> {
  const guestId = req.session.guestId;
  return new Promise((resolve, reject) => {
    // passport regenerates the session on login, which drops guestId.
    req.login(user, async (err) => {
      if (err) return reject(err);
      try {
        if (guestId) await storage.transferGuestData(guestId, user.id);
        resolve();
      } catch (transferErr) {
        reject(transferErr);
      }
    });
  });
}

// ---- Setup ------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or fewer"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const guestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many guest sessions from this network. Try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again in a few minutes." },
});

export function setupAuth(app: Express) {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }

  const PgStore = connectPgSimple(session);

  app.use(
    session({
      name: "stylematch.sid",
      secret: secret ?? crypto.randomBytes(32).toString("hex"),
      store: new PgStore({ pool, tableName: "session", createTableIfMissing: true }),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (login, password, done) => {
      try {
        const user = await storage.findUserByLogin(login.trim());
        if (!user || !(await verifyPassword(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        done(null, user);
      } catch (err) {
        done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      done(null, (await storage.getUser(id)) ?? false);
    } catch (err) {
      done(err);
    }
  });

  app.get("/api/session", (req, res) => {
    const body: SessionResponse = {
      user: req.user ? toPublicUser(req.user) : null,
      isGuest: !req.user && req.session.guestId !== undefined,
    };
    res.json(body);
  });

  app.post("/api/guest", guestLimiter, (req, res) => {
    if (!req.user && req.session.guestId === undefined) {
      req.session.guestId = newGuestId();
    }
    res.json({ user: null, isGuest: !req.user } satisfies SessionResponse);
  });

  app.post(
    "/api/register",
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.issues[0].message);
      }
      const { email, username, password } = parsed.data;

      const taken = await storage.isUsernameOrEmailTaken(username, email);
      if (taken.username) throw new HttpError(409, "That username is taken");
      if (taken.email) throw new HttpError(409, "An account with that email already exists");

      const user = await storage.createUser({ email, username, password: await hashPassword(password) });
      await logIn(req, user);
      res.status(201).json(toPublicUser(user));
    }),
  );

  app.post("/api/login", authLimiter, (req, res, next) => {
    passport.authenticate(
      "local",
      (err: Error | null, user: DbUser | false, info?: { message: string }) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info?.message ?? "Invalid username or password" });
        logIn(req, user)
          .then(() => res.json(toPublicUser(user)))
          .catch(next);
      },
    )(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);
        res.clearCookie("stylematch.sid");
        res.sendStatus(204);
      });
    });
  });
}
