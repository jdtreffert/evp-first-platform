import type { RawEventRecord } from "../../../../backend/src/types/UnifiedEvents";
import type { Encounter } from "../../../../backend/src/types/Encounter";

/** The values entered for an encounter that is created together with an event. */
export interface EncounterDraft {
  type: string;
  date: string;
  summary: string;
}

/** The calendar date of an encounter, ignoring any time of day. */
export function encounterDay(encounter: Encounter): string {
  return encounter.encounterDate.slice(0, 10);
}

/** One line identifying an encounter: its date, type and summary when recorded. */
export function encounterLabel(encounter: Encounter): string {
  return [encounterDay(encounter), encounter.encounterType || "Encounter", encounter.encounterSummary]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Splits encounters into those on the given calendar date and the rest, keeping their order. This only
 * suggests encounters to the user; a matching date never links anything by itself.
 */
export function splitEncountersByDate(
  encounters: readonly Encounter[],
  date: string,
): { sameDate: Encounter[]; other: Encounter[] } {
  const sameDate = encounters.filter((encounter) => date !== "" && encounterDay(encounter) === date);
  const other = encounters.filter((encounter) => !sameDate.includes(encounter));
  return { sameDate, other };
}

/** The record posted to create an encounter; blank optional values are left out. */
export function buildEncounterRecord(uid: string, masterId: string, draft: EncounterDraft): RawEventRecord {
  const fields: Record<string, unknown> = {
    Encounter_UID: uid,
    Master_ID: masterId,
    Encounter_Date: draft.date,
  };
  if (draft.type.trim() !== "") fields.Encounter_Type = draft.type;
  if (draft.summary.trim() !== "") fields.Encounter_Summary = draft.summary.trim();
  return { id: uid, fields };
}

/** Marks the "New encounter" choice; it starts with an underscore so it can never equal a real uid. */
export const NEW_ENCOUNTER = "__new__";
