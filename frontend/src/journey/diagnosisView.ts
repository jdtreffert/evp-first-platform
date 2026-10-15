import type { Encounter } from "../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { calendarDay } from "./calendarDay";
import { selectDiagnosisPhase } from "./diagnosisPhase";
import type { DiagnosisPhaseOptions } from "./diagnosisPhase";
import { LANES, lanesFor, presentationFor } from "./presentationPolicy";
import type { EventPresentation, Lane } from "./presentationPolicy";

/** An event in the view, with how it is presented and the encounter it links to. */
export interface ViewEvent {
  event: UnifiedEvent;
  presentation: EventPresentation;
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

export interface DiagnosisView {
  /** The Diagnosis event the view is built around, as it appears in its lane. */
  milestone: ViewEvent;
  /** Every dated Diagnosis event, earliest first, so the view can offer a switch. */
  diagnosisCandidates: UnifiedEvent[];
  /** Only the lanes that have events, in the agreed order; Other last. */
  lanes: ViewLane[];
  encounters: EncounterConnector[];
  /** The span of dates drawn: the earliest and latest of the event dates and the encounter dates shown. */
  range: { start: string; end: string };
  /** Events whose date is unknown. They are never placed on the timeline. */
  undated: UnifiedEvent[];
}

function laneRank(laneId: string): number {
  const index = LANES.findIndex((lane) => lane.id === laneId);
  return index === -1 ? LANES.length : index;
}

/**
 * Builds the Diagnosis view from a patient's current events and encounters: the phase selected by
 * `selectDiagnosisPhase`, laid out in the lanes of the presentation policy, plus the encounters that join
 * events across lanes. It derives everything from the events and changes none of them. Membership comes only
 * from the recorded Encounter_UID, never from shared dates. Returns null when there is no dated Diagnosis event.
 */
export function buildDiagnosisView(
  events: readonly UnifiedEvent[],
  encounters: readonly Encounter[],
  options: DiagnosisPhaseOptions = {},
): DiagnosisView | null {
  const phase = selectDiagnosisPhase(events, options);
  if (!phase) return null;

  const encountersByUid = new Map(encounters.map((encounter) => [encounter.uid, encounter]));
  const toViewEvent = (event: UnifiedEvent): ViewEvent => ({
    event,
    presentation: presentationFor(event.eventType),
    day: calendarDay(event.eventDate),
    encounter: (event.encounterUid ? encountersByUid.get(event.encounterUid) : undefined) ?? null,
  });

  const viewEvents = phase.events.map(toViewEvent);

  const lanes: ViewLane[] = lanesFor(phase.events.map((event) => event.eventType)).map((lane) => ({
    lane,
    events: viewEvents.filter((view) => view.presentation.lane.id === lane.id),
  }));

  const inPhase = new Set(phase.events.map((event) => event.uid));
  const connectors: EncounterConnector[] = [];
  for (const encounter of encounters) {
    const members = viewEvents.filter((view) => view.encounter?.uid === encounter.uid);
    if (members.length === 0) continue;
    const laneIds = [...new Set(members.map((view) => view.presentation.lane.id))].sort(
      (a, b) => laneRank(a) - laneRank(b),
    );
    const outsideCount = events.filter((event) => event.encounterUid === encounter.uid && !inPhase.has(event.uid)).length;
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

  return {
    milestone: toViewEvent(phase.diagnosis),
    diagnosisCandidates: phase.diagnosisCandidates,
    lanes,
    encounters: connectors,
    range: { start: days[0], end: days[days.length - 1] },
    undated: phase.undated,
  };
}
