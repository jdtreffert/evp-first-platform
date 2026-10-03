import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { EventRepository } from "./persistence/eventRepository";
import { createApiRouter } from "./routes";

export interface AppDependencies {
  repository: EventRepository;
}

export function createApp({ repository }: AppDependencies): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/", (_req, res) => {
    res.send("EVP First backend running");
  });

  app.use("/api", createApiRouter(repository));
  app.use(errorHandler);

  return app;
}
