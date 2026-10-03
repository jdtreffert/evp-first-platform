import { Router } from "express";
import { ingestEventController } from "../controllers/ingestionController";
import { validateEventController } from "../controllers/validationController";

export const eventsRouter = Router();

eventsRouter.post("/ingest", ingestEventController);
eventsRouter.post("/validate", validateEventController);
