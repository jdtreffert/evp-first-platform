import { UnifiedEvent } from "../types/UnifiedEvents";
import { EventQuery, EventQueryResult } from "./eventQuery";

export interface SaveOptions {
  ownerMasterId?: string;
  /** Role of the account saving the event, recorded for provenance. */
  actorRole?: string;
}

/** A superseded version of an event, kept when the event is replaced. */
export interface EventVersion {
  event: UnifiedEvent;
  supersededAt: string;
  supersededByRole: string;
}

export interface SaveResult {
  created: boolean;
}

/**
 * Storage abstraction for UnifiedEvents. Implementations must treat `uid` as the
 * identity: saving an existing uid replaces the stored event (idempotent upsert).
 */
export interface EventRepository {
  save(event: UnifiedEvent, options?: SaveOptions): Promise<SaveResult>;
  getByUid(uid: string): Promise<UnifiedEvent | null>;
  /** Earlier versions of an event, oldest first. Versions are never removed. */
  history(uid: string): Promise<EventVersion[]>;
  list(): Promise<UnifiedEvent[]>;
  query(query: EventQuery): Promise<EventQueryResult>;
}
