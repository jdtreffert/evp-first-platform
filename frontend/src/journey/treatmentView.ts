import type { Encounter } from "../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import type { DiagnosisPhaseOptions } from "./diagnosisPhase";
import { composePhase } from "./phaseView";
import type { PhaseLanes, ViewEvent } from "./phaseView";
import { selectTreatmentPhase } from "./treatmentPhase";

export interface TreatmentView extends PhaseLanes {
  /** The Diagnosis the phase follows, or null when none is recorded. */
  diagnosis: ViewEvent | null;
  /** The recorded "Treatment completed" that ends the phase, or null while treatment is ongoing. */
  completion: ViewEvent | null;
  ongoing: boolean;
  /** Events whose date is unknown. They are never placed on the timeline. */
  undated: UnifiedEvent[];
}

/**
 * Builds the Treatment view from a patient's current events and encounters: the phase selected by
 * `selectTreatmentPhase`, laid out in the lanes of the presentation policy, plus the encounters that join
 * events across lanes, such as an infusion visit joining a delivery, a lab and a ctDNA draw. It derives
 * everything from the events and changes none of them. Membership comes only from the recorded Encounter_UID,
 * never from shared dates. Returns null when there is no dated Treatment_ event.
 */
export function buildTreatmentView(
  events: readonly UnifiedEvent[],
  encounters: readonly Encounter[],
  options: DiagnosisPhaseOptions = {},
): TreatmentView | null {
  const phase = selectTreatmentPhase(events, options);
  if (!phase) return null;

  const { lanes, encounters: connectors, range, toViewEvent } = composePhase(phase.events, events, encounters);
  return {
    diagnosis: phase.diagnosis ? toViewEvent(phase.diagnosis) : null,
    completion: phase.completion ? toViewEvent(phase.completion) : null,
    ongoing: phase.ongoing,
    lanes,
    encounters: connectors,
    range,
    undated: phase.undated,
  };
}
