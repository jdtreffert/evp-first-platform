import { Request, Response } from "express";
import { ingestEvent } from "../services/ingestionService";

export function ingestEventController(req: Request, res: Response): void {
  res.status(201).json(ingestEvent(req.body));
}
