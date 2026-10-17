import type { Encounter } from "../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { calendarDay, daysBetween } from "./calendarDay";
import { assessCompleteResponse } from "./completeResponse";
import type { CompleteResponse } from "./completeResponse";
import type { DiagnosisPhaseOptions } from "./diagnosisPhase";
import { summarizeDiseaseStatus } from "./diseaseStatus";
import type { DiseaseStatusSummary } from "./diseaseStatus";
import { composePhase } from "./phaseView";
import type { PhaseLanes, PhaseReference, ViewEvent } from "./phaseView";
import { selectSurveillancePhase } from "./surveillancePhase";

export interface SurveillanceOptions extends DiagnosisPhaseOptions {
  /**
   * The YYYY-MM-DD date an ongoing complete response is measured to. Defaults to the day of the latest recorded
   * event, so the view never depends on the clock unless the caller passes today's date.
   */
  asOf?: string;
}

export interface SurveillanceView extends PhaseLanes {
  /** The recorded "Treatment completed" the phase follows. It sits in the Treatment phase and is marked on the axis. */
  completion: ViewEvent;
  /** The duration of complete response from the recorded confirming decision, or null when none is recorded. */
  completeResponse: CompleteResponse | null;
  /** The latest explicit Disease_Status over the whole record, or "not recorded"; never inferred. */
  diseaseStatus: DiseaseStatusSummary;
  /** The most recent event in the phase. */
  latest: ViewEvent;
  /** Days from the completion to the latest event recorded. */
  daysToLatest: number;
  /** The first Progression or Recurrence recorded in the phase, or null when none is recorded. */
  firstDiseaseEvent: ViewEvent | null;
  /** Days from the completion to that event; null when there is none. */
  daysToFirstDiseaseEvent: number | null;
  /** Events whose date is unknown. They are never placed on the timeline. */
  undated: UnifiedEvent[];
}

/** The outcome of building the Surveillance view: the view, or why there is none yet. */
export type SurveillanceResult =
  | { status: "no-treatment" | "treatment-ongoing" }
  | { status: "no-events-yet"; completionDay: string }
  | { status: "ready"; view: SurveillanceView };

/**
 * Builds the Surveillance view from a patient's current events and encounters: the events after the recorded
 * Treatment completed, laid out in the lanes of the presentation policy, with the completion marked on the axis
 * and the encounters that join events across lanes. The facts it reports (the latest event, the first
 * Progression or Recurrence, and the days to each) are read from recorded dates only; "none recorded" means
 * no such event is in the record, not that none occurred. It changes nothing it is given.
 */
export function buildSurveillanceView(
  events: readonly UnifiedEvent[],
  encounters: readonly Encounter[],
  options: SurveillanceOptions = {},
): SurveillanceResult {
  const phase = selectSurveillancePhase(events, options);
  if (phase.status === "no-treatment" || phase.status === "treatment-ongoing") return { status: phase.status };
  if (phase.status === "no-events-yet") return { status: "no-events-yet", completionDay: calendarDay(phase.completion.eventDate) };

  const { lanes, encounters: connectors, range, toViewEvent } = composePhase(phase.events, events, encounters);
  const completion = toViewEvent(phase.completion);
  const latest = toViewEvent(phase.events[phase.events.length - 1]);
  const firstDisease = phase.events.find((event) => event.eventType === "Progression" || event.eventType === "Recurrence");
  const firstDiseaseEvent = firstDisease ? toViewEvent(firstDisease) : null;

  // The confirming decision may be dated before the completion, so it is read from all events, not the phase.
  const completeResponse = assessCompleteResponse(events, options.asOf ?? latest.day);
  const confirmationDay = completeResponse ? calendarDay(completeResponse.confirmation.eventDate) : "";
  const references: PhaseReference[] = [{ day: completion.day, label: "Treatment completed" }];
  if (confirmationDay) references.push({ day: confirmationDay, label: "Complete response confirmed" });
  const axisStart = [completion.day, range.start, confirmationDay].filter(Boolean).sort()[0];

  return {
    status: "ready",
    view: {
      lanes,
      encounters: connectors,
      // The axis begins at the completion, or at an earlier confirmation, so both lines are drawn.
      range: { start: axisStart, end: range.end },
      references,
      completion,
      completeResponse,
      diseaseStatus: summarizeDiseaseStatus(events),
      latest,
      daysToLatest: daysBetween(completion.day, latest.day),
      firstDiseaseEvent,
      daysToFirstDiseaseEvent: firstDiseaseEvent ? daysBetween(completion.day, firstDiseaseEvent.day) : null,
      undated: phase.undated,
    },
  };
}
