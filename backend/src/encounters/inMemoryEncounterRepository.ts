import { Encounter } from "../types/Encounter";
import {
  EncounterQuery,
  EncounterQueryResult,
  EncounterRepository,
  EncounterSaveOptions,
  EncounterSaveResult,
  EncounterVersion,
  applyEncounterQuery,
  prepareSave,
} from "./encounterRepository";

export class InMemoryEncounterRepository implements EncounterRepository {
  private readonly encounters = new Map<string, Encounter>();
  private readonly versions: EncounterVersion[] = [];

  async save(encounter: Encounter, options: EncounterSaveOptions = {}): Promise<EncounterSaveResult> {
    const existing = this.encounters.get(encounter.uid);
    const { saved, superseded } = prepareSave(existing, encounter, options);
    if (superseded) this.versions.push(superseded);
    this.encounters.set(saved.uid, saved);
    return { created: existing === undefined, encounter: saved };
  }

  async getByUid(uid: string): Promise<Encounter | null> {
    return this.encounters.get(uid) ?? null;
  }

  async history(uid: string): Promise<EncounterVersion[]> {
    return this.versions.filter((v) => v.encounter.uid === uid);
  }

  async query(query: EncounterQuery): Promise<EncounterQueryResult> {
    return applyEncounterQuery([...this.encounters.values()], query);
  }
}
