import { Request, Response } from "express";
import { EventRepository } from "../persistence/eventRepository";
import { getEventByUid, queryEvents } from "../services/queryService";
import { HttpError } from "../utils/httpError";

export function createQueryController(repository: EventRepository) {
  return {
    async queryEventsController(req: Request, res: Response): Promise<void> {
      const query = req.authUser?.role === "patient"
        ? { ...req.query, masterId: req.authUser.masterId ?? "" }
        : req.query;
      res.status(200).json(await queryEvents(repository, query));
    },

    async getEventController(req: Request, res: Response): Promise<void> {
      const event = await getEventByUid(repository, String(req.params.uid));
      if (req.authUser?.role === "patient" && event.masterId !== req.authUser.masterId) {
        throw new HttpError(404, "Event not found");
      }
      res.status(200).json(event);
    },
  };
}
