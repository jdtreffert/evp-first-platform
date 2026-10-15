import { Request, Response } from "express";
import { DocumentStore } from "../documents/documentStore";
import { EncounterRepository } from "../encounters/encounterRepository";
import { EventRepository } from "../persistence/eventRepository";
import { ingestEvent } from "../services/ingestionService";
import { persistEvent } from "../services/persistenceService";

export function createIngestionController(repository: EventRepository, documents?: DocumentStore, encounters?: EncounterRepository) {
  return async function ingestEventController(req: Request, res: Response): Promise<void> {
    const event = ingestEvent(req.body, {
      masterId: req.authUser?.role === "patient" ? req.authUser.masterId ?? undefined : undefined,
    });
    const { created } = await persistEvent(repository, event, {
      ownerMasterId: req.authUser?.role === "patient" ? req.authUser.masterId ?? undefined : undefined,
      actorRole: req.authUser?.role,
      documents,
      encounters,
    });
    res.status(created ? 201 : 200).json(event);
  };
}
