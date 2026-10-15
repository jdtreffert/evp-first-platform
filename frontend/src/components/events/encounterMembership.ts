import type { RawEventRecord, UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { shiftDate } from "./dates";

/** How far either side of an encounter's date the "nearby" suggestions reach. */
export const NEARBY_DAYS = 14;

/** The calendar date of an event, or an empty string when it has none. */
export function eventDay(event: UnifiedEvent): string {
  return event.eventDate?.slice(0, 10) ?? "";
}

/** One line identifying an event: its date, type and summary when recorded. */
export function eventLabel(event: UnifiedEvent): string {
  return [eventDay(event) || "no date", event.eventType.replaceAll("_", " "), event.eventSummary]
    .filter(Boolean)
    .join(" · ");
}

/** Inclusive date range searched for events that could join an encounter. */
export function candidateWindow(date: string, nearby: boolean): { from: string; to: string } {
  return nearby ? { from: shiftDate(date, -NEARBY_DAYS), to: shiftDate(date, NEARBY_DAYS) } : { from: date, to: date };
}

/** Events that belong to no encounter. Only these are offered as suggestions. */
export function unlinked(events: readonly UnifiedEvent[]): UnifiedEvent[] {
  return events.filter((event) => !event.encounterUid);
}

/**
 * The events listed in the membership checklist: the encounter's current members, events the user has
 * already ticked, and the suggestions, once each, by date then uid.
 */
export function checklistEvents(
  members: readonly UnifiedEvent[],
  picked: readonly UnifiedEvent[],
  suggestions: readonly UnifiedEvent[],
): UnifiedEvent[] {
  const byUid = new Map<string, UnifiedEvent>();
  for (const event of [...suggestions, ...picked, ...members]) byUid.set(event.uid, event);
  return [...byUid.values()].sort((a, b) => {
    const dayA = eventDay(a);
    const dayB = eventDay(b);
    if (dayA !== dayB) return dayA < dayB ? -1 : 1;
    return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
  });
}

/** Which events to link to the encounter and which to remove from it, given what is ticked. */
export function membershipChanges(
  memberUids: readonly string[],
  selected: ReadonlySet<string>,
): { toLink: string[]; toUnlink: string[] } {
  const members = new Set(memberUids);
  return {
    toLink: [...selected].filter((uid) => !members.has(uid)),
    toUnlink: memberUids.filter((uid) => !selected.has(uid)),
  };
}

/**
 * The record that saves an event again with its Encounter_UID set, or removed when null. It starts from the
 * stored record so nothing else about the event changes.
 */
export function withEncounterLink(event: UnifiedEvent, encounterUid: string | null): RawEventRecord {
  const fields: Record<string, unknown> = { ...event.payload.fields };
  delete fields.Encounter_UID;
  if (encounterUid) fields.Encounter_UID = encounterUid;
  return { id: event.uid, fields };
}
