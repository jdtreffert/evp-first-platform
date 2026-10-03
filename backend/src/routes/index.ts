import { Router } from "express";
import { eventsRouter } from "./eventsRoute";

export const apiRouter = Router();

apiRouter.use("/events", eventsRouter);
