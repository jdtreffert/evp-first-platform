import { Router } from "express";
import { ingestEventController } from "../controllers/ingestionController";

export const eventsRouter = Router();

eventsRouter.post("/ingest", ingestEventController);
