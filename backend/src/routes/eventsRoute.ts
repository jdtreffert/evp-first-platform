import { Router } from "express";
import { createBatchController } from "../controllers/batchController";
import { createIngestionController } from "../controllers/ingestionController";
import { createWithdrawalController } from "../controllers/withdrawalController";
import { createQueryController } from "../controllers/queryController";
import { validateEventController } from "../controllers/validationController";
import { EventRepository } from "../persistence/eventRepository";
import { AuthService } from "../auth/authService";
import { DocumentStore } from "../documents/documentStore";
import { EncounterRepository } from "../encounters/encounterRepository";
import { createRequireAuth, requireRoles } from "../auth/authMiddleware";

export function createEventsRouter(
  repository: EventRepository,
  auth: AuthService,
  documents: DocumentStore,
  encounters: EncounterRepository,
): Router {
  const router = Router();
  const { queryEventsController, getEventController, getEventHistoryController } = createQueryController(repository);
  const requireAuth = createRequireAuth(auth);

  router.post("/ingest", requireAuth, requireRoles("administrator", "patient"), createIngestionController(repository, documents, encounters));
  router.post("/batch", requireAuth, requireRoles("administrator", "patient"), createBatchController(repository, documents, encounters));
  router.post("/validate", requireAuth, validateEventController);
  const { withdrawEventController, restoreEventController } = createWithdrawalController(repository);
  router.post("/:uid/withdraw", requireAuth, requireRoles("administrator", "patient"), withdrawEventController);
  router.post("/:uid/restore", requireAuth, requireRoles("administrator", "patient"), restoreEventController);
  router.get("/query", requireAuth, queryEventsController);
  // Must stay after the fixed GET routes so "query" is never treated as a uid.
  router.get("/:uid/history", requireAuth, getEventHistoryController);
  router.get("/:uid", requireAuth, getEventController);

  return router;
}
