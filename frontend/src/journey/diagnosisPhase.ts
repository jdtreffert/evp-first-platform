import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";

/** The events that make up the Diagnosis phase of a journey, built around one Diagnosis event. */
export interface DiagnosisPhase {
  /** The Diagnosis event the phase is built around; it is also the first-class milestone. */
  diagnosis: UnifiedEvent;
  /** Every dated Diagnosis event, earliest first, so a view can offer a switch. */
  diagnosisCandidates: UnifiedEvent[];
  /** Events in the phase, earliest first, including the chosen Diagnosis event itself. */
  events: UnifiedEvent[];
  /** Events with no usable date. Their position is unknown, so they are never placed in the phase. */
  undated: UnifiedEvent[];
}

export interface DiagnosisPhaseOptions {
  /** Build the phase around this Diagnosis event; defaults to the earliest one. */
  diagnosisUid?: string;
}

/** Treatment events belong to the Treatment phase, not the Diagnosis phase. */
export function isTreatmentEvent(event: UnifiedEvent): boolean {
  return event.eventType.startsWith("Treatment_");
}

/** The calendar date as recorded, ignoring any time or offset; null when absent or malformed. */
function calendarDate(event: UnifiedEvent): string | null {
  const date = event.eventDate?.slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function byDateThenUid(a: UnifiedEvent, b: UnifiedEvent): number {
  const dateA = calendarDate(a) ?? "";
  const dateB = calendarDate(b) ?? "";
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}

/**
 * Selects the Diagnosis phase from a patient's current events. The phase is every dated event on or before
 * the Diagnosis date, except treatment events. Selection uses event type and date only; recorded
 * relationships are optional and are not required. Returns null when there is no dated Diagnosis event.
 */
export function selectDiagnosisPhase(
  events: readonly UnifiedEvent[],
  options: DiagnosisPhaseOptions = {},
): DiagnosisPhase | null {
  const dated = events.filter((event) => calendarDate(event) !== null);
  const undated = events.filter((event) => calendarDate(event) === null).sort(byDateThenUid);

  const diagnosisCandidates = dated.filter((event) => event.eventType === "Diagnosis").sort(byDateThenUid);
  if (diagnosisCandidates.length === 0) return null;

  const diagnosis =
    diagnosisCandidates.find((event) => event.uid === options.diagnosisUid) ?? diagnosisCandidates[0];
  const diagnosisDate = calendarDate(diagnosis) as string;

  const phaseEvents = dated
    .filter((event) => (calendarDate(event) as string) <= diagnosisDate && !isTreatmentEvent(event))
    .sort(byDateThenUid);

  return { diagnosis, diagnosisCandidates, events: phaseEvents, undated };
}
