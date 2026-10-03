import { detectEventType } from "../ingestion/detectEventType";
import { normalizerRegistry } from "../normalizers/normalizerRegistry";
import { rawEventRecordSchema } from "../schemas/rawEventRecordSchema";
import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";
import { HttpError } from "../utils/httpError";
import { validateEvent } from "./validationService";

export function ingestEvent(input: unknown): UnifiedEvent {
  const parsed = rawEventRecordSchema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid event record: expected { id, fields }");
  }
  const raw: RawEventRecord = parsed.data;

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

  const event = normalizer(raw);

  const validation = validateEvent(event);
  if (!validation.valid) {
    throw new HttpError(422, "Normalized event failed validation", validation.errors);
  }

  return event;
}
