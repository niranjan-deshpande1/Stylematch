import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
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

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Use a consistent session secret for all environments
  const SESSION_SECRET = 'stylematch-secure-session-secret-2025';

  // Configure session settings across multiple devices
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: true, // Changed to true to ensure session is always saved to store
    saveUninitialized: true, // Changed to true to ensure session is created for all users
    rolling: true, // Refresh the cookie on each request to prevent expiration
    store: storage.sessionStore,
    name: 'stylematch.sid', // Custom cookie name for better security
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 60, // 60 days for long-term persistence
      // Set secure to false in all environments for preview
      // This allows HTTP access for development and testing
      secure: false,
      httpOnly: true, // Prevent client-side access
      // Use 'lax' for better browser compatibility while maintaining security
      sameSite: 'lax',
      path: '/' // Ensure cookie is available across the entire site
    }
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

  // Properly type and handle deserialization
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

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);

        // Return the user without the password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
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

      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return next(err);
        }

        // Return user without the password hash
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
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