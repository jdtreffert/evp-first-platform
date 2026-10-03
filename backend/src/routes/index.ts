import { Router } from "express";
import { EventRepository } from "../persistence/eventRepository";
import { createEventsRouter } from "./eventsRoute";
import { AuthService } from "../auth/authService";
import { createAuthRouter } from "../auth/authRoutes";

export function createApiRouter(repository: EventRepository, auth: AuthService): Router {
  const router = Router();

  router.use("/auth", createAuthRouter(auth));
  router.use("/events", createEventsRouter(repository, auth));

  return router;
}
