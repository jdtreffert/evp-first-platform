import { UnifiedEvent } from "../types/UnifiedEvents";

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
}
