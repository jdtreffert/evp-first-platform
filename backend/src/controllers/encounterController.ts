import { Request, Response } from "express";
import { EncounterRepository } from "../encounters/encounterRepository";
import { getEncounterByUid, ingestEncounter, queryEncounters } from "../services/encounterService";
import { HttpError } from "../utils/httpError";

export function createEncounterController(repository: EncounterRepository) {
  /** The patient record a patient account is confined to; undefined for every other role. */
  const ownerOf = (req: Request): string | undefined =>
    req.authUser?.role === "patient" ? req.authUser.masterId ?? undefined : undefined;

  /** Patients only ever see their own encounters; anything else looks like it does not exist. */
  async function loadVisible(req: Request) {
    const encounter = await getEncounterByUid(repository, String(req.params.uid));
    if (req.authUser?.role === "patient" && encounter.masterId !== req.authUser.masterId) {
      throw new HttpError(404, "Encounter not found");
    }
    return encounter;
  }

  return {
    async saveEncounterController(req: Request, res: Response): Promise<void> {
      const ownerMasterId = ownerOf(req);
      const encounter = ingestEncounter(req.body, { masterId: ownerMasterId });
      const { created, encounter: stored } = await repository.save(encounter, {
        ownerMasterId,
        actorRole: req.authUser?.role,
      });
      res.status(created ? 201 : 200).json(stored);
    },

    async queryEncountersController(req: Request, res: Response): Promise<void> {
      const query = req.authUser?.role === "patient"
        ? { ...req.query, masterId: req.authUser.masterId ?? "" }
        : req.query;
      res.status(200).json(await queryEncounters(repository, query));
    },

    async getEncounterController(req: Request, res: Response): Promise<void> {
      res.status(200).json(await loadVisible(req));
    },

    async getEncounterHistoryController(req: Request, res: Response): Promise<void> {
      const encounter = await loadVisible(req);
      res.status(200).json({ uid: encounter.uid, versions: await repository.history(encounter.uid) });
    },
  };
}
