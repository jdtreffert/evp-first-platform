import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { treatmentFullName, treatmentShortName } from "./treatmentLabels";

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
  { id: "treatment", label: "Treatment", color: "#f87171" },
  { id: "response-disease-status", label: "Response & Disease Status", color: "#a3e635" },
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
  Treatment_Start: "treatment",
  Treatment_Delivery: "treatment",
  Treatment_Change: "treatment",
  Treatment_Response: "response-disease-status",
  Recurrence: "response-disease-status",
  Progression: "response-disease-status",
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
  // Provisional: Response & Disease Status is the other candidate home. Moving it is a change here only.
  Disease_Status: "decisions-milestones",
};

/**
 * Event types deliberately left without a lane for now, until a view shows where they belong. They are drawn
 * in the Other lane meanwhile. It is empty today: every registered event type has a lane.
 */
export const UNASSIGNED_EVENT_TYPES: readonly string[] = [];

/**
 * Event types drawn as a distinctive milestone rather than an ordinary event: the points where evidence from
 * other events is turned into a conclusion or a decision. Keyed by event type, so every Treatment_Change is a
 * milestone, including the one that records that treatment is completed.
 */
const milestoneEventTypes = new Set<string>([
  "Diagnosis",
  "Treatment_Start",
  "Treatment_Change",
  "Treatment_Response",
  "Recurrence",
  "Progression",
  "Disease_Status",
]);

/**
 * Event types drawn with the assessment marker: the milestone diamond with an inner ring, to tell a recorded
 * assessment of status from the other milestones while staying within the same diamond size and color.
 */
const assessmentEventTypes = new Set<string>(["Disease_Status"]);

/**
 * The label for each Disease_Status_Category. Only the recorded category chooses the label: never the notes,
 * the other events, or the date. An unrecognised or missing category has no entry and uses the type's name.
 */
const diseaseStatusLabels: Record<string, string> = {
  "No evidence of disease": "No evidence of disease",
  "Indeterminate or suspicious": "Indeterminate or suspicious",
  "Disease present": "Disease present",
  Unknown: "Disease status unknown",
};

/** The label for a recorded Disease_Status_Category, or null when it is missing or not one of the options. */
export function diseaseStatusLabel(category: string | null | undefined): string | null {
  return typeof category === "string" && Object.prototype.hasOwnProperty.call(diseaseStatusLabels, category)
    ? diseaseStatusLabels[category]
    : null;
}

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
  /** "assessment" is a milestone diamond with an inner ring; every other type uses the standard marker. */
  marker: "standard" | "assessment";
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
    marker: assessmentEventTypes.has(eventType) ? "assessment" : "standard",
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

function formatDose(dose: number): string {
  return String(Number.isInteger(dose) ? dose : Number(dose.toFixed(2)));
}

/**
 * The short text drawn beside a marker, to keep timelines compact. A treatment delivery is labelled from its
 * data: a radiation dose by the dose and units ("2 Gy"), anything else by the treatment's short name, with the
 * cycle when recorded ("EV C2"), and plainly "Delivery" when no treatment is named. A Disease_Status is labelled
 * by its recorded category. Every other event uses the name of its type. The full details stay in the hover
 * text and the detail panel.
 */
export function compactLabel(event: UnifiedEvent): string {
  if (event.eventType === "Disease_Status") return diseaseStatusLabel(event.diseaseStatusCategory) ?? eventTypeLabel(event.eventType);
  if (event.eventType !== "Treatment_Delivery") return eventTypeLabel(event.eventType);

  const units = event.treatmentDoseUnits;
  if (typeof event.treatmentDose === "number" && (units === "Gy" || units === "cGy")) {
    return `${formatDose(event.treatmentDose)} ${units}`;
  }
  const cycle = typeof event.treatmentCycle === "number" ? ` C${event.treatmentCycle}` : "";
  return `${treatmentShortName(event.treatmentName) ?? "Delivery"}${cycle}`;
}

/** Delivery statuses that mean the dose was not fully given as planned. */
const INCOMPLETE_DELIVERY_STATUSES = new Set(["Held", "Interrupted", "Partially Delivered", "Not Completed"]);

/**
 * Whether a treatment delivery is recorded as not fully given, so it is drawn hollow. A missing or unknown
 * status is never treated as incomplete: missing data is unknown, not negative.
 */
export function isIncompleteDelivery(event: UnifiedEvent): boolean {
  return (
    event.eventType === "Treatment_Delivery" &&
    event.treatmentDeliveryStatus !== null &&
    event.treatmentDeliveryStatus !== undefined &&
    INCOMPLETE_DELIVERY_STATUSES.has(event.treatmentDeliveryStatus)
  );
}

export interface LegendEntry {
  short: string;
  full: string;
}

/** The abbreviations used by the given events' labels, with their full names, once each in order of appearance. */
export function legendFor(events: Iterable<UnifiedEvent>): LegendEntry[] {
  const entries = new Map<string, LegendEntry>();
  for (const event of events) {
    if (event.eventType !== "Treatment_Delivery") continue;
    const label = compactLabel(event);
    const full = treatmentFullName(event.treatmentName);
    const short = treatmentShortName(event.treatmentName);
    // Only a delivery labelled by its treatment name has an abbreviation to explain.
    if (full && short && label.startsWith(short) && !entries.has(short)) entries.set(short, { short, full });
  }
  return [...entries.values()];
}
