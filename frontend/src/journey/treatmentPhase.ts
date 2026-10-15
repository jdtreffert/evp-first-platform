import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { calendarDay } from "./calendarDay";
import { isTreatmentEvent, selectDiagnosisPhase } from "./diagnosisPhase";
import type { DiagnosisPhaseOptions } from "./diagnosisPhase";

/** The Treatment_Change_Type that records the end of a treatment course. */
export const TREATMENT_COMPLETED = "Treatment completed";

/** The events that make up the Treatment phase of a journey. */
export interface TreatmentPhase {
  /** The Diagnosis the phase follows, or null when none is recorded (the phase then starts at the first treatment event). */
  diagnosis: UnifiedEvent | null;
  /** The recorded "Treatment completed" that ends the phase, or null while treatment is ongoing. */
  completion: UnifiedEvent | null;
  /** True when no completion ends the phase: treatment has not been recorded as finished. */
  ongoing: boolean;
  /** Events in the phase, earliest first. */
  events: UnifiedEvent[];
  /** Events with no usable date. Their position is unknown, so they are never placed in the phase. */
  undated: UnifiedEvent[];
}

function dayOf(event: UnifiedEvent): string {
  return calendarDay(event.eventDate);
}

function byDateThenUid(a: UnifiedEvent, b: UnifiedEvent): number {
  const dayA = dayOf(a);
  const dayB = dayOf(b);
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}

function isCompletion(event: UnifiedEvent): boolean {
  return event.eventType === "Treatment_Change" && event.treatmentChangeType === TREATMENT_COMPLETED;
}

/**
 * Selects the Treatment phase from a patient's current events. The phase holds every Treatment_ event, whatever
 * its date (the Diagnosis phase leaves them out), and every other event dated after the Diagnosis date, up to
 * the end of treatment. Treatment ends only when it is recorded: the latest "Treatment completed" ends it
 * unless a start, delivery or other change is dated after it, which means treatment carried on. With no
 * recorded completion the phase is open-ended. Selection uses event type and date only; relationships are
 * optional and not used. Returns null when there is no dated Treatment_ event.
 */
export function selectTreatmentPhase(
  events: readonly UnifiedEvent[],
  options: DiagnosisPhaseOptions = {},
): TreatmentPhase | null {
  const dated = events.filter((event) => dayOf(event) !== "");
  const undated = events.filter((event) => dayOf(event) === "").sort(byDateThenUid);

  const treatmentEvents = dated.filter(isTreatmentEvent).sort(byDateThenUid);
  if (treatmentEvents.length === 0) return null;

  const diagnosis = selectDiagnosisPhase(events, options)?.diagnosis ?? null;
  const diagnosisDay = diagnosis ? dayOf(diagnosis) : "";

  const delivery = treatmentEvents.filter((event) => ["Treatment_Start", "Treatment_Delivery", "Treatment_Change"].includes(event.eventType));
  const completions = delivery.filter(isCompletion);
  const latestCompletion = completions[completions.length - 1] ?? null;
  const carriedOn =
    latestCompletion !== null &&
    delivery.some((event) => !isCompletion(event) && dayOf(event) > dayOf(latestCompletion));
  const completion = carriedOn ? null : latestCompletion;
  const endDay = completion ? dayOf(completion) : "";
  const firstTreatmentDay = dayOf(treatmentEvents[0]);

  const phaseEvents = dated
    .filter((event) => {
      if (isTreatmentEvent(event)) return true;
      const day = dayOf(event);
      const afterStart = diagnosisDay !== "" ? day > diagnosisDay : day >= firstTreatmentDay;
      return afterStart && (endDay === "" || day <= endDay);
    })
    .sort(byDateThenUid);

  return { diagnosis, completion, ongoing: completion === null, events: phaseEvents, undated };
}
