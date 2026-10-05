import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { EventRepository } from "./persistence/eventRepository";
import { createApiRouter } from "./routes";
import { AuthService } from "./auth/authService";
import { createOriginGuard } from "./auth/originGuard";
import { DocumentStore } from "./documents/documentStore";
import { InMemoryDocumentStore } from "./documents/inMemoryDocumentStore";

export interface AppDependencies {
  repository: EventRepository;
  auth: AuthService;
  documents?: DocumentStore;
  frontendOrigin?: string;
}

export function createApp({ repository, auth, documents = new InMemoryDocumentStore(), frontendOrigin = "http://localhost:5173" }: AppDependencies): express.Express {
  const app = express();

  app.use(cors({ origin: frontendOrigin, credentials: true }));
  app.use(createOriginGuard(frontendOrigin));
  app.use(express.json({ limit: "5mb" }));

  app.get("/", (_req, res) => {
    res.send("EVP First backend running");
  });

  app.use("/api", createApiRouter(repository, auth, documents));
  app.use(errorHandler);

  return app;
}
