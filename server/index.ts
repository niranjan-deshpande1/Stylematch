import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import * as db from "./db";
import { initializeMigrations } from "./migrations";
import { scheduleAutomaticBackups } from "./backup-restore";

// Override DATABASE_URL to use Supabase connection pooler when available
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const projectRef = supabaseUrl.split('//')[1].split('.')[0];
  // Use the pooler connection string which works better with Drizzle
  process.env.DATABASE_URL = `postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
}

const app = express();

// CORS middleware for domain deployment
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set default site mode to app unless explicitly set
if (!process.env.SITE_MODE) {
  process.env.SITE_MODE = 'app';
}

// Set up authentication with sessions and Passport
setupAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (!res.headersSent) {
      console.error(`Error handler: ${message}`);
      res.status(status).json({ message });
    } else {
      console.error(`Error occurred after headers sent: ${message}`);
    }

    // Log error but don't rethrow it to prevent terminating the server
    console.error(err);
  });

  // Serve uploaded images statically - must be before catch-all routes
  app.use('/uploads', express.static('uploads'));

  // vite dev server in development, built files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // api and client are both served on this port
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);

    // Initialize database migrations and backups
    try {
      await initializeMigrations();
      log(`Database migrations completed successfully`);

      // Schedule automatic backups (every 6 hours)
      await scheduleAutomaticBackups();
      log(`Automatic backup system initialized`);
    } catch (error) {
      console.error('Failed to initialize database migrations or backups:', error);
      // Don't crash the server, just log the error
    }
  });
})();
