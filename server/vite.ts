import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express, { type Express } from "express";
import type { Server } from "http";

const serverDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Development: run Vite in middleware mode so the React app gets hot reloading
 * from the same port as the API.
 */
export async function setupDevServer(app: Express, server: Server) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: path.resolve(serverDir, "..", "vite.config.ts"),
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    try {
      const templatePath = path.resolve(serverDir, "..", "client", "index.html");
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}

/** Production: serve the built client and fall back to index.html for client-side routes. */
export function serveClient(app: Express) {
  const distPath = path.resolve(serverDir, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`No client build found at ${distPath}. Run "npm run build" first.`);
  }

  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
