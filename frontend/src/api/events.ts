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

export function queryEvents(masterId: string, offset = 0, limit = 100): Promise<EventQueryResult> {
  const query = new URLSearchParams({ masterId, order: "desc", limit: String(limit), offset: String(offset) });
  return requestJson<EventQueryResult>(`/events/query?${query.toString()}`);
}
