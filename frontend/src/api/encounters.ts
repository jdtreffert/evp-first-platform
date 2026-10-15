import type { RawEventRecord } from "../../../backend/src/types/UnifiedEvents";
import type { Encounter } from "../../../backend/src/types/Encounter";
import { postJson, requestJson } from "./client";

interface EncounterQueryResult {
  encounters: Encounter[];
  total: number;
  limit: number;
  offset: number;
}

/** A patient's encounters, newest first (at most 500). */
export async function listEncounters(masterId: string): Promise<Encounter[]> {
  const query = new URLSearchParams({ masterId, order: "desc", limit: "500" });
  return (await requestJson<EncounterQueryResult>(`/encounters/query?${query.toString()}`)).encounters;
}

/** Creates an encounter, or replaces one with the same Encounter_UID (the earlier version is kept). */
export function saveEncounter(record: RawEventRecord): Promise<Encounter> {
  return postJson<Encounter>("/encounters", record);
}
