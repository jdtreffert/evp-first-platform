import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { calendarDay } from "./calendarDay";
import { selectDiagnosisPhase } from "./diagnosisPhase";
import type { DiagnosisPhaseOptions } from "./diagnosisPhase";
import { COMPLETE_RESPONSE_CONFIRMED } from "./completeResponse";
import { TREATMENT_COMPLETED, selectTreatmentPhase, selectTreatmentStart } from "./treatmentPhase";

/**
 * The event types the Journey Summary includes. Routine evidence and deliveries (imaging, labs, ctDNA, symptoms,
 * every Treatment_Delivery and so on) are deliberately absent: they stay in the phase views. The one Decision it
 * includes is a confirmed complete response, which is chosen by its recorded Decision_Type.
 */
export const SUMMARY_EVENT_TYPES: readonly string[] = [
  "Diagnosis",
  "Treatment_Start",
  "Treatment_Change",
  "Disease_Status",
  "Recurrence",
  "Progression",
];

/** Whether the Summary includes this event: by its type, or the Decision that confirms a complete response. */
export function isSummaryEvent(event: UnifiedEvent): boolean {
  return (
    SUMMARY_EVENT_TYPES.includes(event.eventType) ||
    (event.eventType === "Decision" && event.decisionType === COMPLETE_RESPONSE_CONFIRMED)
  );
}

const dayOf = (event: UnifiedEvent): string => calendarDay(event.eventDate);

function byDateThenUid(a: UnifiedEvent, b: UnifiedEvent): number {
  const dayA = dayOf(a);
  const dayB = dayOf(b);
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}

/** Events of the journey, withdrawn ones left out. Everything in the Summary reads from these. */
export function currentEvents(events: readonly UnifiedEvent[]): UnifiedEvent[] {
  return events.filter((event) => !event.withdrawnAt);
}

export interface SummarySelection {
  /** The Summary events with a usable date, earliest first; same-date events go in uid order. */
  milestones: UnifiedEvent[];
  /** Summary events with a missing or invalid date. Their position is unknown, so they are never placed. */
  undated: UnifiedEvent[];
}

/** Selects the Summary's events from a patient's events by type and date only. It changes nothing it is given. */
export function selectSummaryEvents(events: readonly UnifiedEvent[]): SummarySelection {
  const included = currentEvents(events).filter(isSummaryEvent);
  return {
    milestones: included.filter((event) => dayOf(event) !== "").sort(byDateThenUid),
    undated: included.filter((event) => dayOf(event) === "").sort(byDateThenUid),
  };
}

/** Why an anchor is not available. */
export type AnchorUnavailableReason =
  /** No such event is recorded. */
  | "no-event"
  /** The event is recorded but none has a valid date. */
  | "undated-event"
  /** A Treatment completed is recorded, but treatment was recorded as continuing after it. */
  | "treatment-continued";

export type SummaryAnchor = { status: "present"; event: UnifiedEvent } | { status: "unavailable"; reason: AnchorUnavailableReason };

export interface SummaryAnchors {
  diagnosis: SummaryAnchor;
  treatmentStart: SummaryAnchor;
  treatmentCompletion: SummaryAnchor;
}

function unrecorded(events: readonly UnifiedEvent[], isType: (event: UnifiedEvent) => boolean): SummaryAnchor {
  return { status: "unavailable", reason: events.some(isType) ? "undated-event" : "no-event" };
}

/**
 * Finds the three events the durations are measured from, each by the existing selection logic and nothing else:
 * the Diagnosis the phase views are built around, the earliest dated Treatment_Start, and the recorded Treatment
 * completed that ends the Treatment phase. Nothing is inferred: not from deliveries, encounters, a Disease_Status,
 * a confirmed complete response, the first surveillance event or free text, and an anchor that is missing or has
 * no valid date is unavailable, with the reason, and is never replaced by another event.
 */
export function selectSummaryAnchors(events: readonly UnifiedEvent[], options: DiagnosisPhaseOptions = {}): SummaryAnchors {
  const current = currentEvents(events);

  const diagnosis = selectDiagnosisPhase(current, options)?.diagnosis;
  const start = selectTreatmentStart(current);

  const isCompletion = (event: UnifiedEvent) => event.eventType === "Treatment_Change" && event.treatmentChangeType === TREATMENT_COMPLETED;
  const completion = selectTreatmentPhase(current, options)?.completion;
  let treatmentCompletion: SummaryAnchor;
  if (completion) treatmentCompletion = { status: "present", event: completion };
  else if (current.some((event) => isCompletion(event) && dayOf(event) !== "")) {
    treatmentCompletion = { status: "unavailable", reason: "treatment-continued" };
  } else treatmentCompletion = unrecorded(current, isCompletion);

  return {
    diagnosis: diagnosis ? { status: "present", event: diagnosis } : unrecorded(current, (event) => event.eventType === "Diagnosis"),
    treatmentStart: start ? { status: "present", event: start } : unrecorded(current, (event) => event.eventType === "Treatment_Start"),
    treatmentCompletion,
  };
}
