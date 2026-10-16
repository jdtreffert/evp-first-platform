import { Request, Response } from "express";
import { EventRepository } from "../persistence/eventRepository";
import { restoreEvent, withdrawEvent } from "../services/withdrawalService";

export function createWithdrawalController(repository: EventRepository) {
  const actorOf = (req: Request) => ({
    ownerMasterId: req.authUser?.role === "patient" ? req.authUser.masterId ?? "" : undefined,
    actorRole: req.authUser?.role,
  });

  return {
    async withdrawEventController(req: Request, res: Response): Promise<void> {
      res.status(200).json(await withdrawEvent(repository, String(req.params.uid), req.body?.reason, actorOf(req)));
    },

    async restoreEventController(req: Request, res: Response): Promise<void> {
      res.status(200).json(await restoreEvent(repository, String(req.params.uid), actorOf(req)));
    },
  };
}
