/**
 * Presentation policy: how an event type is shown, kept apart from the clinical data. Everything here is
 * display-only. It never changes an event, and the lane an event type sits in carries no clinical meaning.
 * Lanes are keyed by event type, never by attribute values, so the same type always appears in the same lane.
 *
 * Lanes are never stored: not in events, the schema, the backend or any saved setting. Renaming a lane or
 * moving an event type is a change to this file and its test only. If lane ids are ever persisted (for
 * example a saved view), keep the ids stable and change only the labels.
 */

export interface Lane {
  readonly id: string;
  readonly label: string;
  /** The lane's display color (a hex value suited to a dark background). */
  readonly color: string;
}

/** The thematic lanes, in the order they are drawn. */
export const LANES = [
  { id: "symptoms-experience", label: "Symptoms & Experience", color: "#fbbf24" },
  { id: "investigations", label: "Investigations", color: "#38bdf8" },
  { id: "procedures", label: "Procedures", color: "#a78bfa" },
  { id: "pathology-molecular", label: "Pathology & Molecular", color: "#34d399" },
  { id: "context-self-management", label: "Context & Self-Management", color: "#94a3b8" },
  { id: "decisions-milestones", label: "Decisions & Milestones", color: "#f472b6" },
] as const;

export type LaneId = (typeof LANES)[number]["id"];

/** The color of the line joining the events of one encounter. It is not a lane color. */
export const ENCOUNTER_COLOR = "#e5e7eb";

/**
 * Where events with no assigned lane are drawn, so that nothing silently disappears. It is drawn after the
 * assigned lanes and only when it has events.
 */
export const OTHER_LANE: Lane = { id: "other", label: "Other", color: "#9ca3af" };

const laneIdByEventType: Record<string, LaneId> = {
  Symptom: "symptoms-experience",
  QoL: "symptoms-experience",
  Lab: "investigations",
  Imaging: "investigations",
  Imaging_Response: "investigations",
  Cytology: "investigations",
  Cystoscopy: "investigations",
  ctDNA: "investigations",
  utDNA: "investigations",
  TURBT: "procedures",
  Cystoscopy_Biopsy: "procedures",
  Procedure: "procedures",
  Pathology: "pathology-molecular",
  Somatic: "pathology-molecular",
  Germline: "pathology-molecular",
  Note: "context-self-management",
  Diagnosis: "decisions-milestones",
  Decision: "decisions-milestones",
};

/**
 * Event types deliberately left without a lane for now, to be placed once the Treatment and Surveillance
 * views show where they belong. They are drawn in the Other lane until then.
 */
export const UNASSIGNED_EVENT_TYPES = [
  "Treatment_Start",
  "Treatment_Delivery",
  "Treatment_Change",
  "Treatment_Response",
  "Recurrence",
  "Progression",
] as const;

/** Event types drawn as a distinctive milestone rather than an ordinary event. */
const milestoneEventTypes = new Set<string>(["Diagnosis"]);

const eventTypeLabels: Record<string, string> = {
  QoL: "Quality of life",
  Lab: "Lab work",
  Imaging_Response: "Imaging response",
  Cystoscopy_Biopsy: "Cystoscopy biopsy",
};

export interface EventPresentation {
  /** The name shown for the event type. */
  label: string;
  lane: Lane;
  /** False when the type has no lane (unassigned or unknown) and is drawn in the Other lane. */
  assigned: boolean;
  /** Drawn as a milestone. */
  milestone: boolean;
}

/** The name shown for an event type; an unknown type is shown by its own name. */
export function eventTypeLabel(eventType: string): string {
  return eventTypeLabels[eventType] ?? eventType.replaceAll("_", " ");
}

/**
 * How an event type is presented. Unknown and newly added types never fail: they are drawn in the Other
 * lane under their own name.
 */
export function presentationFor(eventType: string): EventPresentation {
  const laneId = Object.prototype.hasOwnProperty.call(laneIdByEventType, eventType)
    ? laneIdByEventType[eventType]
    : undefined;
  const lane = laneId === undefined ? undefined : LANES.find((candidate) => candidate.id === laneId);
  return {
    label: eventTypeLabel(eventType),
    lane: lane ?? OTHER_LANE,
    assigned: lane !== undefined,
    milestone: milestoneEventTypes.has(eventType),
  };
}

/** The lanes to draw, in order, for the given event types: assigned lanes that have events, then Other. */
export function lanesFor(eventTypes: Iterable<string>): Lane[] {
  const used = new Set<string>();
  for (const eventType of eventTypes) used.add(presentationFor(eventType).lane.id);
  const lanes: Lane[] = LANES.filter((lane) => used.has(lane.id));
  if (used.has(OTHER_LANE.id)) lanes.push(OTHER_LANE);
  return lanes;
}
