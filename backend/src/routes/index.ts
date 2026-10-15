import { Router } from "express";
import { EventRepository } from "../persistence/eventRepository";
import { createEventsRouter } from "./eventsRoute";
import { AuthService } from "../auth/authService";
import { createAuthRouter } from "../auth/authRoutes";
import { createDocumentsRouter } from "./documentsRoute";
import { DocumentStore } from "../documents/documentStore";
import { EncounterRepository } from "../encounters/encounterRepository";
import { createEncountersRouter } from "./encountersRoute";

export function createApiRouter(repository: EventRepository, auth: AuthService, documents: DocumentStore,
  encounters: EncounterRepository,
): Router {
  const router = Router();

  router.use("/auth", createAuthRouter(auth));
  router.use("/events", createEventsRouter(repository, auth, documents, encounters));
  router.use("/encounters", createEncountersRouter(encounters, auth, documents));
  router.use("/documents", createDocumentsRouter(documents, auth));

  return router;
}
