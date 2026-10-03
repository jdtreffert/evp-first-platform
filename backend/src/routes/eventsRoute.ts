import { Router } from "express";
import { createIngestionController } from "../controllers/ingestionController";
import { createQueryController } from "../controllers/queryController";
import { validateEventController } from "../controllers/validationController";
import { EventRepository } from "../persistence/eventRepository";

export function createEventsRouter(repository: EventRepository): Router {
  const router = Router();
  const { queryEventsController, getEventController } = createQueryController(repository);

  router.post("/ingest", createIngestionController(repository));
  router.post("/validate", validateEventController);
  router.get("/query", queryEventsController);
  // Must stay after the fixed GET routes so "query" is never treated as a uid.
  router.get("/:uid", getEventController);

  return router;
}
