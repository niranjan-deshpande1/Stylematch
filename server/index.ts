import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "http";
import { MulterError } from "multer";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import { HttpError } from "./http";
import { serveClient, setupDevServer } from "./vite";

const app = express();
app.disable("x-powered-by");
// The host puts a proxy in front of the app; trust it so req.ip is the real client.
app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));

// One line per API request: method, path, status, duration.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

setupAuth(app);
registerRoutes(app);

// Unknown API routes get a JSON 404 instead of falling through to the React app.
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

const server = createServer(app);
const port = Number(process.env.PORT ?? 5000);

if (process.env.NODE_ENV === "production") {
  serveClient(app);
} else {
  await setupDevServer(app, server);
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Images must be 8 MB or smaller" : err.message;
    return res.status(400).json({ message });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong on our end" });
});

server.listen(port, () => {
  console.log(`StyleMatch running on http://localhost:${port}`);
});
