import { EventRepository, SaveResult } from "../persistence/eventRepository";
import { UnifiedEvent } from "../types/UnifiedEvents";

export function persistEvent(
  repository: EventRepository,
  event: UnifiedEvent,
  options: { ownerMasterId?: string } = {},
): Promise<SaveResult> {
  return repository.save(event, options);
}
