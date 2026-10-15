import { Router } from "express";
import { AuthService } from "../auth/authService";
import { createRequireAuth, requireRoles } from "../auth/authMiddleware";
import { createEncounterController } from "../controllers/encounterController";
import { DocumentStore } from "../documents/documentStore";
import { EncounterRepository } from "../encounters/encounterRepository";

export function createEncountersRouter(encounters: EncounterRepository, auth: AuthService, documents?: DocumentStore): Router {
  const router = Router();
  const requireAuth = createRequireAuth(auth);
  const controller = createEncounterController(encounters, documents);

  router.post("/", requireAuth, requireRoles("administrator", "patient"), controller.saveEncounterController);
  router.get("/query", requireAuth, controller.queryEncountersController);
  // Must stay after the fixed GET routes so "query" is never treated as a uid.
  router.get("/:uid/history", requireAuth, controller.getEncounterHistoryController);
  router.get("/:uid", requireAuth, controller.getEncounterController);

  return router;
}
