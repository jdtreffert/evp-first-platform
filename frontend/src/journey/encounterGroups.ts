import type { Encounter } from "../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";

/** An encounter together with the events that link to it. */
export interface EncounterGroup {
  encounter: Encounter;
  /** The linked events, ordered like the timeline that contains the group. */
  events: UnifiedEvent[];
}

/** One entry of a grouped timeline: an encounter with its events, or an event that is shown on its own. */
export type TimelineEntry =
  | { kind: "encounter"; group: EncounterGroup }
  | { kind: "event"; event: UnifiedEvent };

/** The calendar date, or an empty string when the value is absent or not a real date. */
function calendarDay(date: string | null | undefined): string {
  const day = date?.slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

function entryDay(entry: TimelineEntry): string {
  return entry.kind === "encounter" ? calendarDay(entry.group.encounter.encounterDate) : calendarDay(entry.event.eventDate);
}

function entryUid(entry: TimelineEntry): string {
  return entry.kind === "encounter" ? entry.group.encounter.uid : entry.event.uid;
}

/** Undated entries always come last, whichever way the dates run; ties are broken by kind, then uid. */
function compareEntries(direction: 1 | -1) {
  return (a: TimelineEntry, b: TimelineEntry): number => {
    const dayA = entryDay(a);
    const dayB = entryDay(b);
    if (dayA === "" && dayB !== "") return 1;
    if (dayA !== "" && dayB === "") return -1;
    if (dayA !== dayB) return dayA < dayB ? -direction : direction;
    if (a.kind !== b.kind) return a.kind === "encounter" ? -1 : 1;
    const uidA = entryUid(a);
    const uidB = entryUid(b);
    return uidA < uidB ? -1 : uidA > uidB ? 1 : 0;
  };
}

/**
 * Arranges a patient's current events into a timeline where events that link to the same encounter sit
 * together under it. Grouping uses only the recorded `Encounter_UID`: events that merely share a date are
 * never grouped. An event is shown on its own when it has no encounter (unknown, not "outside any
 * encounter") or when its encounter is not among the given encounters. Encounters with none of the given
 * events are left out. Entries are ordered by the encounter's date or the event's own date; the two dates
 * are independent and neither is changed.
 */
export function groupTimeline(
  events: readonly UnifiedEvent[],
  encounters: readonly Encounter[],
  order: "asc" | "desc" = "desc",
): TimelineEntry[] {
  const direction = order === "asc" ? 1 : -1;
  const known = new Map(encounters.map((encounter) => [encounter.uid, encounter]));
  const members = new Map<string, UnifiedEvent[]>();
  const singles: UnifiedEvent[] = [];

  for (const event of events) {
    const encounter = event.encounterUid ? known.get(event.encounterUid) : undefined;
    if (!encounter) {
      singles.push(event);
      continue;
    }
    members.set(encounter.uid, [...(members.get(encounter.uid) ?? []), event]);
  }

  const entries: TimelineEntry[] = singles.map((event) => ({ kind: "event", event }));
  for (const [uid, linked] of members) {
    const group: EncounterGroup = {
      encounter: known.get(uid) as Encounter,
      events: linked
        .map((event): TimelineEntry => ({ kind: "event", event }))
        .sort(compareEntries(direction))
        .map((entry) => (entry as { kind: "event"; event: UnifiedEvent }).event),
    };
    entries.push({ kind: "encounter", group });
  }
  return entries.sort(compareEntries(direction));
}
