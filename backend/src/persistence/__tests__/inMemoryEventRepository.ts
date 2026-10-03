import { UnifiedEvent } from "../../types/UnifiedEvents";
import { EventQuery, EventQueryResult, applyEventQuery } from "../eventQuery";
import { EventRepository, SaveResult } from "../eventRepository";
import { HttpError } from "../../utils/httpError";

export class InMemoryEventRepository implements EventRepository {
  readonly events = new Map<string, UnifiedEvent>();

  async save(event: UnifiedEvent, options: { ownerMasterId?: string } = {}): Promise<SaveResult> {
    const existing = this.events.get(event.uid);
    if (
      options.ownerMasterId !== undefined &&
      (event.masterId !== options.ownerMasterId ||
        (existing !== undefined && existing.masterId !== options.ownerMasterId))
    ) {
      throw new HttpError(403, "Patient event ownership violation");
    }
    const created = !this.events.has(event.uid);
    this.events.set(event.uid, event);
    return { created };
  }

  async getByUid(uid: string): Promise<UnifiedEvent | null> {
    return this.events.get(uid) ?? null;
  }

  async list(): Promise<UnifiedEvent[]> {
    return [...this.events.values()];
  }

  async query(query: EventQuery): Promise<EventQueryResult> {
    return applyEventQuery([...this.events.values()], query);
  }
}
