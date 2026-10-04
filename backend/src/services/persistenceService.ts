import { EventRepository, SaveOptions, SaveResult } from "../persistence/eventRepository";
import { UnifiedEvent } from "../types/UnifiedEvents";

export function persistEvent(
  repository: EventRepository,
  event: UnifiedEvent,
  options: SaveOptions = {},
): Promise<SaveResult> {
  return repository.save(event, options);
}
