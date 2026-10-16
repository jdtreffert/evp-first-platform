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

/** Events of one type, optionally bounded by `from` and `to`; at most the 100 most recent. */
export async function queryEventsInRange(masterId: string, eventType: string, from: string | undefined, to: string | undefined): Promise<UnifiedEvent[]> {
  const query = new URLSearchParams({ masterId, eventType, order: "desc", limit: "100" });
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  return (await requestJson<EventQueryResult>(`/events/query?${query.toString()}`)).events;
}

/** Every event of a patient, oldest first, read a page at a time. */
export async function queryAllEvents(masterId: string): Promise<UnifiedEvent[]> {
  const pageSize = 500;
  const all: UnifiedEvent[] = [];
  // The bound only guards against a server that never reports the end.
  for (let offset = 0; offset < 100 * pageSize; offset += pageSize) {
    const query = new URLSearchParams({ masterId, order: "asc", limit: String(pageSize), offset: String(offset) });
    const page = await requestJson<EventQueryResult>(`/events/query?${query.toString()}`);
    all.push(...page.events);
    if (page.events.length === 0 || all.length >= page.total) break;
  }
  return all;
}

/** A patient's events between two dates, inclusive, oldest first (at most 500). Undated events never match. */
export async function queryEventsByDates(masterId: string, from: string, to: string): Promise<UnifiedEvent[]> {
  const query = new URLSearchParams({ masterId, from, to, order: "asc", limit: "500" });
  return (await requestJson<EventQueryResult>(`/events/query?${query.toString()}`)).events;
}

/** The events linked to one encounter (at most 500). */
export async function queryEventsOfEncounter(masterId: string, encounterUid: string): Promise<UnifiedEvent[]> {
  const query = new URLSearchParams({ masterId, encounterUid, order: "asc", limit: "500" });
  return (await requestJson<EventQueryResult>(`/events/query?${query.toString()}`)).events;
}

export function queryEvents(masterId: string, offset = 0, limit = 100): Promise<EventQueryResult> {
  const query = new URLSearchParams({ masterId, order: "desc", limit: String(limit), offset: String(offset) });
  return requestJson<EventQueryResult>(`/events/query?${query.toString()}`);
}

/** A patient's events that were withdrawn as entered in error, oldest first (at most 500). */
export async function queryWithdrawnEvents(masterId: string): Promise<UnifiedEvent[]> {
  const query = new URLSearchParams({ masterId, withdrawn: "only", order: "asc", limit: "500" });
  return (await requestJson<EventQueryResult>(`/events/query?${query.toString()}`)).events;
}

/** Withdraws an event as entered in error. It is kept, with its history, and can be restored. */
export function withdrawEvent(uid: string, reason: string): Promise<UnifiedEvent> {
  return postJson<UnifiedEvent>(`/events/${encodeURIComponent(uid)}/withdraw`, { reason });
}

export function restoreEvent(uid: string): Promise<UnifiedEvent> {
  return postJson<UnifiedEvent>(`/events/${encodeURIComponent(uid)}/restore`, {});
}

export interface EventVersion {
  event: UnifiedEvent;
  supersededAt: string;
  supersededByRole: string;
}

export async function getEventHistory(uid: string): Promise<EventVersion[]> {
  return (await requestJson<{ versions: EventVersion[] }>(`/events/${encodeURIComponent(uid)}/history`)).versions;
}
