import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.send("EVP First backend running");
  });

  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}
