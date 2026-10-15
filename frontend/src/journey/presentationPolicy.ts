/**
 * Presentation policy: how an event type is shown, kept apart from the clinical data. Everything here is
 * display-only. It never changes an event, and the lane an event type sits in carries no clinical meaning.
 * Lanes are keyed by event type, never by attribute values, so the same type always appears in the same lane.
 */

export interface Lane {
  readonly id: string;
  readonly label: string;
}

/** The thematic lanes, in the order they are drawn. */
export const LANES = [
  { id: "presentation", label: "Presentation" },
  { id: "investigations", label: "Investigations" },
  { id: "procedures", label: "Procedures" },
  { id: "pathology-molecular", label: "Pathology & Molecular" },
  { id: "context-self-management", label: "Context & Self-Management" },
  { id: "decisions-milestones", label: "Decisions & Milestones" },
] as const;

export type LaneId = (typeof LANES)[number]["id"];

/**
 * Where events with no assigned lane are drawn, so that nothing silently disappears. It is drawn after the
 * assigned lanes and only when it has events.
 */
export const OTHER_LANE: Lane = { id: "other", label: "Other" };

const laneIdByEventType: Record<string, LaneId> = {
  Symptom: "presentation",
  QoL: "presentation",
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
