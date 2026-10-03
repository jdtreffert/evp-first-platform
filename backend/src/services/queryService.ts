import { EventQueryResult } from "../persistence/eventQuery";
import { EventRepository } from "../persistence/eventRepository";
import { eventQuerySchema } from "../schemas/eventQuerySchema";
import { UnifiedEvent } from "../types/UnifiedEvents";
import { HttpError } from "../utils/httpError";
import { isValidUid } from "../validation/fieldValidators";

export function queryEvents(
  repository: EventRepository,
  rawQuery: unknown,
): Promise<EventQueryResult> {
  const parsed = eventQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid query parameters",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return repository.query(parsed.data);
}

export async function getEventByUid(
  repository: EventRepository,
  uid: string,
): Promise<UnifiedEvent> {
  if (!isValidUid(uid)) {
    throw new HttpError(400, "Invalid uid");
  }
  const event = await repository.getByUid(uid);
  if (!event) {
    throw new HttpError(404, "Event not found");
  }
  return event;
}
