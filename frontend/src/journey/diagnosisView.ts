import type { Encounter } from "../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { selectDiagnosisPhase } from "./diagnosisPhase";
import type { DiagnosisPhaseOptions } from "./diagnosisPhase";
import { composePhase } from "./phaseView";
import type { PhaseLanes, ViewEvent } from "./phaseView";

export type { EncounterConnector, PhaseLanes, ViewEvent, ViewLane } from "./phaseView";

export interface DiagnosisView extends PhaseLanes {
  /** The Diagnosis event the view is built around, as it appears in its lane. */
  milestone: ViewEvent;
  /** Every dated Diagnosis event, earliest first, so the view can offer a switch. */
  diagnosisCandidates: UnifiedEvent[];
  /** Events whose date is unknown. They are never placed on the timeline. */
  undated: UnifiedEvent[];
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

  const { lanes, encounters: connectors, range, toViewEvent } = composePhase(phase.events, events, encounters);
  return {
    milestone: toViewEvent(phase.diagnosis),
    diagnosisCandidates: phase.diagnosisCandidates,
    lanes,
    encounters: connectors,
    range,
    undated: phase.undated,
  };
}
