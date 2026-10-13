import type { Express } from "express";
import { closetRouter } from "./closet";
import { inspirationRouter } from "./inspiration";
import { outfitsRouter } from "./outfits";
import { imagesRouter } from "./images";
import { siteRouter } from "./site";

export function registerRoutes(app: Express) {
  app.use("/api/closet", closetRouter);
  app.use("/api/inspiration", inspirationRouter);
  app.use("/api/outfits", outfitsRouter);
  app.use("/api/images", imagesRouter);
  app.use("/api/site", siteRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
}
