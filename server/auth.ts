import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import * as crypto from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      username: string;
      password: string;
    }
  }
}

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Use environment variable for session secret with a fallback
  const SESSION_SECRET = process.env.SESSION_SECRET || 'stylematch-secure-session-secret-2025';

  // Calculate cookie expiration date
  const sessionMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  const sessionTTL = Math.floor(sessionMaxAge / 1000); // 30 days in seconds for session store TTL
  const expirationDate = new Date(Date.now() + sessionMaxAge);

  // session settings
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // reset the expiry on every request
    store: storage.sessionStore,
    name: 'stylematch.sid',
    proxy: true, // Trust the reverse proxy when secure cookies are in use
    cookie: {
      maxAge: sessionMaxAge,
      expires: expirationDate,
      // Only use secure in production
      secure: process.env.NODE_ENV === 'production' ? true : false,
      httpOnly: true,
      // Lax allows cookies to be sent with top-level navigations
      sameSite: 'lax' as const,
      path: '/', // Make cookie available across the entire site
      domain: undefined
    },
  };

  app.set("trust proxy", 1);

  app.use(session(sessionSettings));

  app.use(passport.initialize());

  app.use(passport.session());

  // Local strategy for username/password authentication
  // This strategy supports logging in with either email or username
  passport.use(
    new LocalStrategy({
      // Allow users to use either email or username as the "username" field
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true,
    },
    async (req, username, password, done) => {
      try {
        // First try to find the user by username
        let user = await storage.getUserByUsername(username);

        // If not found by username, try by email if the value looks like an email
        if (!user && username.includes('@')) {
          user = await storage.getUserByEmail(username);
        }

        // Verify the password if user exists
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: 'Invalid credentials' });
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Carefully serialize and deserialize user objects to avoid session issues
  passport.serializeUser((user: any, done) => {
    // Make sure we're serializing a valid user object
    if (user && user.id) {
      return done(null, user.id);
    }
    // Handle invalid user objects
    console.error("Attempting to serialize invalid user:", user);
    done(null, null);
  });

  // load the user from the id stored in the session
  passport.deserializeUser(async (id: string | number, done) => {
    // Convert string ID to number if needed (common serialization issue)
    const userId = typeof id === 'string' ? parseInt(id, 10) : id;

    try {
      // Type guard for NaN
      if (isNaN(userId as number)) {
        console.error("Invalid user ID during deserialization:", id);
        return done(null, false);
      }

      const user = await storage.getUser(userId as number);

      // Handle case where user can't be found
      if (!user) {
        return done(null, false);
      }

      done(null, user);
    } catch (err) {
      console.error('Error deserializing user:', err);

      // Return false instead of the error to prevent crashes
      done(null, false);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate that all required fields are present
      const { email, username, password } = req.body;
      if (!email || !username || !password) {
        return res.status(400).json({
          message: "Email, username, and password are required"
        });
      }

      // Check if email is valid
      if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({
          message: "Please enter a valid email address"
        });
      }

      // Check if username exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({
          message: "Username already exists"
        });
      }

      // Check if email exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          message: "Email already exists"
        });
      }

      // Create the user with a hashed password
      const user = await storage.createUser({
        email,
        username,
        password: await hashPassword(password),
      });

      // Log the user in with session persistence
      req.login(user, (err) => {
        if (err) {
          console.error("Session error during registration:", err);
          return next(err);
        }

        // Ensure session is fully saved before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Error saving session during registration:", saveErr);
            // Continue despite save error
          }

          // Return the user without the password
          const { password, ...userWithoutPassword } = user;
          res.status(201).json(userWithoutPassword);
        });
      });
    } catch (err) {
      console.error("Registration error:", err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          message: info?.message || "Invalid credentials"
        });
      }

      // Login process with better session persistence
      req.login(user, (err) => {
        if (err) {
          console.error("Session error during login:", err);
          return next(err);
        }

        // Make sure session is fully established by forcing a session save
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Error saving session during login:", saveErr);
            // Continue despite save error
          }

          // Return user without the password hash
          const { password, ...userWithoutPassword } = user;
          return res.status(200).json(userWithoutPassword);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Store session ID for logging
    const username = req.user ? (req.user as any).username : 'unknown';

    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return next(err);
      }

      // Destroy the session completely for clean logout
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Error destroying session during logout:", destroyErr);
          // Continue despite error
        }

        // Clear the session cookie on the client
        res.clearCookie('stylematch.sid', {
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax'
        });

        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.user) {
        return res.status(401).json({ message: "User data unavailable" });
      }

      // Return user data without including the password hash
      const { password, ...userWithoutPassword } = req.user as any;
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error in /api/user route:', error);
      if (!res.headersSent) {
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({ message: "Unauthorized" });
}