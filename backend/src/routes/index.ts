import { Router } from "express";
import { EventRepository } from "../persistence/eventRepository";
import { createEventsRouter } from "./eventsRoute";

export function createApiRouter(repository: EventRepository): Router {
  const router = Router();

  router.use("/events", createEventsRouter(repository));

  return router;
}
