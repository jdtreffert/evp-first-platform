import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { calendarDay } from "./calendarDay";
import { isTreatmentEvent } from "./diagnosisPhase";
import type { DiagnosisPhaseOptions } from "./diagnosisPhase";
import { selectTreatmentPhase } from "./treatmentPhase";

/**
 * The Surveillance phase of a journey, or why there is not one yet. It follows the recorded end of treatment,
 * so it exists only once a "Treatment completed" has been recorded.
 */
export type SurveillancePhase =
  | { status: "no-treatment" }
  | { status: "treatment-ongoing" }
  | { status: "no-events-yet"; completion: UnifiedEvent; undated: UnifiedEvent[] }
  | {
      status: "ready";
      /** The recorded "Treatment completed" the phase follows. */
      completion: UnifiedEvent;
      /** Events in the phase, earliest first. */
      events: UnifiedEvent[];
      /** Events with no usable date. Their position is unknown, so they are never placed in the phase. */
      undated: UnifiedEvent[];
    };

function dayOf(event: UnifiedEvent): string {
  return calendarDay(event.eventDate);
}

function byDateThenUid(a: UnifiedEvent, b: UnifiedEvent): number {
  const dayA = dayOf(a);
  const dayB = dayOf(b);
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}

/**
 * Selects the Surveillance phase from a patient's current events: every dated event that is not a Treatment_
 * event and falls after the day treatment was recorded as completed. Treatment events, including a response
 * assessed after completion, stay in the Treatment phase, and events on the completion day belong to
 * Treatment too, so the phases never share an event. Treatment is complete only when it is recorded; with no
 * recorded completion there is no Surveillance phase. Selection uses event type and date only; relationships
 * are optional and not used.
 */
export function selectSurveillancePhase(
  events: readonly UnifiedEvent[],
  options: DiagnosisPhaseOptions = {},
): SurveillancePhase {
  const treatment = selectTreatmentPhase(events, options);
  if (!treatment) return { status: "no-treatment" };
  if (!treatment.completion) return { status: "treatment-ongoing" };

  const completion = treatment.completion;
  const completionDay = dayOf(completion);
  const undated = events.filter((event) => dayOf(event) === "").sort(byDateThenUid);
  const phaseEvents = events
    .filter((event) => dayOf(event) !== "" && !isTreatmentEvent(event) && dayOf(event) > completionDay)
    .sort(byDateThenUid);

  if (phaseEvents.length === 0) return { status: "no-events-yet", completion, undated };
  return { status: "ready", completion, events: phaseEvents, undated };
}
