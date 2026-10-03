import { Request, Response } from "express";
import { validateEvent } from "../services/validationService";

export function validateEventController(req: Request, res: Response): void {
  res.status(200).json(validateEvent(req.body));
}
