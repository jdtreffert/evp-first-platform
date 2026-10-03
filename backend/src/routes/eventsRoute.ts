import { Router } from "express";
import { createIngestionController } from "../controllers/ingestionController";
import { validateEventController } from "../controllers/validationController";
import { EventRepository } from "../persistence/eventRepository";

export function createEventsRouter(repository: EventRepository): Router {
  const router = Router();

  router.post("/ingest", createIngestionController(repository));
  router.post("/validate", validateEventController);

  return router;
}
