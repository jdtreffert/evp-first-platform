import { UnifiedEvent } from "../../types/UnifiedEvents";
import { EventRepository, SaveResult } from "../eventRepository";

export class InMemoryEventRepository implements EventRepository {
  readonly events = new Map<string, UnifiedEvent>();

  async save(event: UnifiedEvent): Promise<SaveResult> {
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
}
