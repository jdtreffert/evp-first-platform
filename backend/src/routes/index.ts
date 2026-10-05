import { Router } from "express";
import { EventRepository } from "../persistence/eventRepository";
import { createEventsRouter } from "./eventsRoute";
import { AuthService } from "../auth/authService";
import { createAuthRouter } from "../auth/authRoutes";
import { createDocumentsRouter } from "./documentsRoute";
import { DocumentStore } from "../documents/documentStore";

export function createApiRouter(repository: EventRepository, auth: AuthService, documents: DocumentStore): Router {
  const router = Router();

  router.use("/auth", createAuthRouter(auth));
  router.use("/events", createEventsRouter(repository, auth, documents));
  router.use("/documents", createDocumentsRouter(documents, auth));

  return router;
}
