import { EncounterQueryResult, EncounterRepository } from "../encounters/encounterRepository";
import { encounterQuerySchema } from "../schemas/encounterQuerySchema";
import { encounterSchema } from "../schemas/encounterSchema";
import { rawEventRecordSchema } from "../schemas/rawEventRecordSchema";
import { Encounter } from "../types/Encounter";
import { HttpError } from "../utils/httpError";
import { isValidUid } from "../validation/fieldValidators";
import { validateFieldValues } from "../validation/fieldOptions";

/** The only fields an encounter keeps; anything else a client sends is dropped. */
const ENCOUNTER_FIELDS = ["Encounter_UID", "Master_ID", "Encounter_Date", "Encounter_Type", "Encounter_Summary"] as const;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/**
 * Validates a raw `{ id, fields }` record and builds an Encounter. Encounter_Date and Master_ID are required;
 * Encounter_Type must be one of the schema options. Patients' Master_ID is overridden by the server.
 */
export function ingestEncounter(input: unknown, options: { masterId?: string } = {}): Encounter {
  const parsed = rawEventRecordSchema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid encounter record: expected { id, fields }");
  }

  const supplied: Record<string, unknown> = { ...parsed.data.fields };
  if (options.masterId !== undefined) supplied.Master_ID = options.masterId;

  const fields: Record<string, unknown> = {};
  for (const name of ENCOUNTER_FIELDS) {
    if (!isBlank(supplied[name])) fields[name] = supplied[name];
  }

  const fieldIssues = validateFieldValues(fields);
  if (fieldIssues.length > 0) {
    throw new HttpError(422, "Encounter fields failed schema validation", fieldIssues);
  }

  const result = encounterSchema.safeParse({
    uid: fields.Encounter_UID ?? parsed.data.id,
    masterId: fields.Master_ID ?? "",
    encounterDate: fields.Encounter_Date,
    encounterType: fields.Encounter_Type ?? null,
    encounterSummary: fields.Encounter_Summary ?? null,
    payload: { id: parsed.data.id, fields },
  });
  if (!result.success) {
    throw new HttpError(
      422,
      "Encounter failed validation",
      result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return result.data as Encounter;
}

export function queryEncounters(repository: EncounterRepository, rawQuery: unknown): Promise<EncounterQueryResult> {
  const parsed = encounterQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid query parameters",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return repository.query(parsed.data);
}

export async function getEncounterByUid(repository: EncounterRepository, uid: string): Promise<Encounter> {
  if (!isValidUid(uid)) {
    throw new HttpError(400, "Invalid uid");
  }
  const encounter = await repository.getByUid(uid);
  if (!encounter) {
    throw new HttpError(404, "Encounter not found");
  }
  return encounter;
}
