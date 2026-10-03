import { UnifiedEvent } from "../types/UnifiedEvents";
import { EventQuery, EventQueryResult } from "./eventQuery";

export interface SaveResult {
  created: boolean;
}

/**
 * Storage abstraction for UnifiedEvents. Implementations must treat `uid` as the
 * identity: saving an existing uid replaces the stored event (idempotent upsert).
 */
export interface EventRepository {
  save(event: UnifiedEvent): Promise<SaveResult>;
  getByUid(uid: string): Promise<UnifiedEvent | null>;
  list(): Promise<UnifiedEvent[]>;
  query(query: EventQuery): Promise<EventQueryResult>;
}
