import type { RawEventRecord, UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { postJson, requestJson } from "./client";

interface EventQueryResult {
  events: UnifiedEvent[];
  total: number;
  limit: number;
  offset: number;
}

export function ingestEvent(record: RawEventRecord): Promise<UnifiedEvent> {
  return postJson<UnifiedEvent>("/events/ingest", record);
}

/** Events of one type up to `to`, and from `from` when given; at most the 100 most recent. */
export async function queryEventsInRange(masterId: string, eventType: string, from: string | undefined, to: string): Promise<UnifiedEvent[]> {
  const query = new URLSearchParams({ masterId, eventType, to, order: "desc", limit: "100" });
  if (from) query.set("from", from);
  return (await requestJson<EventQueryResult>(`/events/query?${query.toString()}`)).events;
}

export function queryEvents(masterId: string, offset = 0, limit = 100): Promise<EventQueryResult> {
  const query = new URLSearchParams({ masterId, order: "desc", limit: String(limit), offset: String(offset) });
  return requestJson<EventQueryResult>(`/events/query?${query.toString()}`);
}

export interface EventVersion {
  event: UnifiedEvent;
  supersededAt: string;
  supersededByRole: string;
}

export async function getEventHistory(uid: string): Promise<EventVersion[]> {
  return (await requestJson<{ versions: EventVersion[] }>(`/events/${encodeURIComponent(uid)}/history`)).versions;
}
