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

  // Event_ID and Event_Created_At are server-owned; ignore any client-supplied values.
  const { Event_ID: _eventId, Event_Created_At: _createdAt, ...clientFields } = raw.fields;
  void _eventId;
  void _createdAt;
  raw.fields = clientFields;

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

  const measureType = raw.fields.Event_Measure_Type || null;
  const measureValue = raw.fields.Numeric_Value ?? null;
  const measureUnits = raw.fields.Numeric_Units || null;
  if ((measureType !== null) !== (measureValue !== null) || (measureUnits !== null && measureValue === null)) {
    throw new HttpError(422, "Event fields failed schema validation", [
      { path: "fields.Event_Measure_Type", message: "Measure type, numeric value and units must be given together (units are optional)" },
    ]);
  }
  event.eventMeasureType = measureType;
  event.eventMeasureValue = measureValue;
  event.eventMeasureUnits = measureUnits;

  event.relatedEventUid = raw.fields.Event_Related_UID || null;
  event.eventRelationship = raw.fields.Event_Relationship || null;

  const validation = validateEvent(event);
  if (!validation.valid) {
    throw new HttpError(422, "Normalized event failed validation", validation.errors);
  }

  return event;
}
