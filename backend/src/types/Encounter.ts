import { RawEventRecord } from "./UnifiedEvents";

/**
 * A healthcare interaction that one or more UnifiedEvents arose from or were recorded in. It is a grouping
 * entity, not a clinical event: it is never stored as an event and never replaces or duplicates one.
 * encounterDate is independent of any member event's eventDate.
 */
export interface Encounter {
  uid: string;
  masterId: string;
  encounterDate: string;
  encounterType?: string | null;
  encounterSummary?: string | null;
  payload: RawEventRecord;

  // Set by the server when the encounter is stored; never taken from the client.
  recordedAt?: string;
  recordedByRole?: string;
  lastModifiedAt?: string;
  lastModifiedByRole?: string;
}
