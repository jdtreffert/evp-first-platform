import { UnifiedEvent } from "../types/UnifiedEvents";

export interface EventQuery {
  masterId?: string;
  eventType?: string;
  /** Inclusive lower bound, YYYY-MM-DD. */
  from?: string;
  /** Inclusive upper bound, YYYY-MM-DD. */
  to?: string;
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

export interface EventQueryResult {
  events: UnifiedEvent[];
  /** Number of events matching the filters, before pagination. */
  total: number;
  limit: number;
  offset: number;
}

/** The calendar date as recorded on the event, ignoring any time or offset. */
function calendarDate(event: UnifiedEvent): string | null {
  return event.eventDate ? event.eventDate.slice(0, 10) : null;
}

function sortKey(event: UnifiedEvent): number | null {
  if (!event.eventDate) return null;
  const time = Date.parse(event.eventDate);
  return Number.isNaN(time) ? null : time;
}

function matches(event: UnifiedEvent, query: EventQuery): boolean {
  if (query.masterId !== undefined && event.masterId !== query.masterId) return false;
  if (query.eventType !== undefined && event.eventType !== query.eventType) return false;

  if (query.from !== undefined || query.to !== undefined) {
    const date = calendarDate(event);
    // Events with no date can never fall inside a date range.
    if (date === null) return false;
    if (query.from !== undefined && date < query.from) return false;
    if (query.to !== undefined && date > query.to) return false;
  }
  return true;
}

/**
 * Pure filter/sort/paginate used by repositories that hold events in memory.
 * Sorted by event date in the requested order with undated events always last;
 * ties are broken by uid so pages are stable.
 */
export function applyEventQuery(events: UnifiedEvent[], query: EventQuery): EventQueryResult {
  const direction = query.order === "asc" ? 1 : -1;

  const filtered = events.filter((e) => matches(e, query)).sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka === null && kb !== null) return 1;
    if (ka !== null && kb === null) return -1;
    if (ka !== null && kb !== null && ka !== kb) return (ka - kb) * direction;
    return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
  });

  return {
    events: filtered.slice(query.offset, query.offset + query.limit),
    total: filtered.length,
    limit: query.limit,
    offset: query.offset,
  };
}
