import { UnifiedEvent } from "../../types/UnifiedEvents";
import { EventQuery, EventQueryResult, applyEventQuery } from "../eventQuery";
import { EventRepository, EventVersion, SaveResult, WithdrawOptions } from "../eventRepository";
import { isWithdrawn, withWithdrawal } from "../withdrawal";
import { HttpError } from "../../utils/httpError";

export class InMemoryEventRepository implements EventRepository {
  readonly events = new Map<string, UnifiedEvent>();
  private readonly versions: EventVersion[] = [];

  async save(event: UnifiedEvent, options: { ownerMasterId?: string } = {}): Promise<SaveResult> {
    const existing = this.events.get(event.uid);
    if (
      options.ownerMasterId !== undefined &&
      (event.masterId !== options.ownerMasterId ||
        (existing !== undefined && existing.masterId !== options.ownerMasterId))
    ) {
      throw new HttpError(403, "Patient event ownership violation");
    }
    if (existing) {
      this.versions.push({ event: existing, supersededAt: new Date().toISOString(), supersededByRole: "system" });
    }
    const created = !this.events.has(event.uid);
    this.events.set(event.uid, event);
    return { created };
  }

  async setWithdrawn(uid: string, withdrawn: boolean, options: WithdrawOptions = {}): Promise<UnifiedEvent | null> {
    const original = this.events.get(uid);
    if (!original) return null;
    if (options.ownerMasterId !== undefined && original.masterId !== options.ownerMasterId) {
      throw new HttpError(403, "Patient event ownership violation");
    }
    if (isWithdrawn(original) === withdrawn) return original;
    const now = new Date().toISOString();
    const role = options.actorRole ?? "system";
    this.versions.push({ event: original, supersededAt: now, supersededByRole: role });
    const changed = withWithdrawal(original, withdrawn, now, role, options.reason);
    this.events.set(uid, changed);
    return changed;
  }

  async getByUid(uid: string): Promise<UnifiedEvent | null> {
    return this.events.get(uid) ?? null;
  }

  async history(uid: string): Promise<EventVersion[]> {
    return this.versions.filter((v) => v.event.uid === uid);
  }

  async list(): Promise<UnifiedEvent[]> {
    return [...this.events.values()];
  }

  async query(query: EventQuery): Promise<EventQueryResult> {
    return applyEventQuery([...this.events.values()], query);
  }
}
