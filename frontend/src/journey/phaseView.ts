import type { Encounter } from "../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { calendarDay } from "./calendarDay";
import { LANES, compactLabel, isIncompleteDelivery, lanesFor, presentationFor } from "./presentationPolicy";
import type { EventPresentation, Lane } from "./presentationPolicy";

/** An event in a phase view, with how it is presented and the encounter it links to. */
export interface ViewEvent {
  event: UnifiedEvent;
  presentation: EventPresentation;
  /** The short text drawn beside the marker; the full name of the type is in `presentation.label`. */
  label: string;
  /** Drawn hollow: a treatment delivery recorded as held, interrupted, partial or not completed. */
  hollow: boolean;
  /** The event's own calendar date; events are placed by this, never by their encounter's date. */
  day: string;
  /** The encounter it links to, or null when it has none or that encounter is not among those given. */
  encounter: Encounter | null;
}

export interface ViewLane {
  lane: Lane;
  /** The lane's events, earliest first. */
  events: ViewEvent[];
}

/**
 * An encounter that has events in the phase. A renderer can join its members, which may be in different lanes,
 * with a line at the encounter's date; members dated differently from the encounter keep their own position.
 */
export interface EncounterConnector {
  encounter: Encounter;
  /** The encounter's own calendar date. */
  day: string;
  /** The members inside the phase, earliest first. */
  members: ViewEvent[];
  /** The lanes the members are in, in lane order. */
  laneIds: string[];
  /** True when the members are in more than one lane, so a line across lanes is needed. */
  crossLane: boolean;
  /** Members of this encounter that fall outside the phase, among the events given. */
  outsideCount: number;
}

/** What every phase view needs to be drawn: lanes of events, encounter connectors and the span of dates. */
export interface PhaseLanes {
  /** Only the lanes that have events, in the agreed order; Other last. */
  lanes: ViewLane[];
  encounters: EncounterConnector[];
  /** The span of dates drawn: the earliest and latest of the event dates and the encounter dates shown. */
  range: { start: string; end: string };
}

function laneRank(laneId: string): number {
  const index = LANES.findIndex((lane) => lane.id === laneId);
  return index === -1 ? LANES.length : index;
}

/**
 * Lays a phase's events out in the lanes of the presentation policy and finds the encounters that join them.
 * The phase events must already be selected and ordered earliest first with a real date each. It derives
 * everything from what it is given and changes none of it. Membership comes only from the recorded
 * Encounter_UID, never from shared dates. `toViewEvent` presents any event the same way as the lanes do.
 */
export function composePhase(
  phaseEvents: readonly UnifiedEvent[],
  allEvents: readonly UnifiedEvent[],
  encounters: readonly Encounter[],
): PhaseLanes & { toViewEvent: (event: UnifiedEvent) => ViewEvent } {
  const encountersByUid = new Map(encounters.map((encounter) => [encounter.uid, encounter]));
  const toViewEvent = (event: UnifiedEvent): ViewEvent => ({
    event,
    presentation: presentationFor(event.eventType),
    label: compactLabel(event),
    hollow: isIncompleteDelivery(event),
    day: calendarDay(event.eventDate),
    encounter: (event.encounterUid ? encountersByUid.get(event.encounterUid) : undefined) ?? null,
  });

  const viewEvents = phaseEvents.map(toViewEvent);

  const lanes: ViewLane[] = lanesFor(phaseEvents.map((event) => event.eventType)).map((lane) => ({
    lane,
    events: viewEvents.filter((view) => view.presentation.lane.id === lane.id),
  }));

  const inPhase = new Set(phaseEvents.map((event) => event.uid));
  const connectors: EncounterConnector[] = [];
  for (const encounter of encounters) {
    const members = viewEvents.filter((view) => view.encounter?.uid === encounter.uid);
    if (members.length === 0) continue;
    const laneIds = [...new Set(members.map((view) => view.presentation.lane.id))].sort(
      (a, b) => laneRank(a) - laneRank(b),
    );
    const outsideCount = allEvents.filter((event) => event.encounterUid === encounter.uid && !inPhase.has(event.uid)).length;
    connectors.push({
      encounter,
      day: calendarDay(encounter.encounterDate),
      members,
      laneIds,
      crossLane: laneIds.length > 1,
      outsideCount,
    });
  }
  connectors.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.encounter.uid < b.encounter.uid ? -1 : 1));

  // The span covers every date drawn, including an encounter dated outside its members' dates.
  const days = [...viewEvents.map((view) => view.day), ...connectors.map((connector) => connector.day)].filter(Boolean).sort();

  return { lanes, encounters: connectors, range: { start: days[0], end: days[days.length - 1] }, toViewEvent };
}
