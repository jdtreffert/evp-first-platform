import { Request, Response } from "express";
import { DocumentStore } from "../documents/documentStore";
import { EventRepository } from "../persistence/eventRepository";
import { ingestBatch } from "../services/batchIngestionService";

export function createBatchController(repository: EventRepository, documents?: DocumentStore) {
  return async function batchIngestController(req: Request, res: Response): Promise<void> {
    // 200 even with failures: the request was processed; per-record outcomes are in the body.
    res.status(200).json(
      await ingestBatch(repository, req.body, {
        masterId: req.authUser?.role === "patient" ? req.authUser.masterId ?? undefined : undefined,
        actorRole: req.authUser?.role,
        documents,
      }),
    );
  };
}
