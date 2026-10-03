import { Request, Response } from "express";
import { EventRepository } from "../persistence/eventRepository";
import { getEventByUid, queryEvents } from "../services/queryService";

export function createQueryController(repository: EventRepository) {
  return {
    async queryEventsController(req: Request, res: Response): Promise<void> {
      res.status(200).json(await queryEvents(repository, req.query));
    },

    async getEventController(req: Request, res: Response): Promise<void> {
      res.status(200).json(await getEventByUid(repository, String(req.params.uid)));
    },
  };
}
