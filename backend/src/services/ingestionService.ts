import { detectEventType } from "../ingestion/detectEventType";
import { normalizerRegistry } from "../normalizers/normalizerRegistry";
import { rawEventRecordSchema } from "../schemas/rawEventRecordSchema";
import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";
import { validateFieldValues } from "../validation/fieldOptions";
import { HttpError } from "../utils/httpError";
import { validateEvent } from "./validationService";

export function ingestEvent(input: unknown, options: { masterId?: string } = {}): UnifiedEvent {
  const parsed = rawEventRecordSchema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid event record: expected { id, fields }");
  }
  const raw: RawEventRecord = options.masterId === undefined
    ? parsed.data
    : { ...parsed.data, fields: { ...parsed.data.fields, Master_ID: options.masterId } };

  const eventType = detectEventType(raw);
  if (!eventType) {
    throw new HttpError(400, "Missing Event_Type");
  }

  const normalizer = Object.prototype.hasOwnProperty.call(normalizerRegistry, eventType)
    ? normalizerRegistry[eventType]
    : undefined;
  if (!normalizer) {
    throw new HttpError(422, `Unsupported event type: ${eventType}`);
  }

  const fieldIssues = validateFieldValues(raw.fields);
  if (fieldIssues.length > 0) {
    throw new HttpError(422, "Event fields failed schema validation", fieldIssues);
  }

  let event: UnifiedEvent;
  try {
    event = normalizer(raw);
  } catch (err) {
    // Normalizers throw only on unusable input (e.g. an unrecognized Treatment subtype).
    throw new HttpError(422, `Could not normalize ${eventType} record: ${(err as Error).message}`);
  }

  const validation = validateEvent(event);
  if (!validation.valid) {
    throw new HttpError(422, "Normalized event failed validation", validation.errors);
  }

  return event;
}
