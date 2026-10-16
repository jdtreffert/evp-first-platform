import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import PatientScopeForm from "../../components/journey/PatientScopeForm";
import PhaseSelectionDetail from "../../components/journey/PhaseSelectionDetail";
import PhaseTimeline from "../../components/journey/PhaseTimeline";
import type { PhaseSelection } from "../../components/journey/PhaseTimeline";
import { layoutPhaseView } from "../../journey/phaseLayout";
import { buildSurveillanceView } from "../../journey/surveillanceView";
import { usePatientData } from "./usePatientData";

/**
 * The surveillance period after treatment, drawn from a patient's existing events: read-only and derived. It
 * holds the events after the recorded "Treatment completed" and exists only once that is recorded.
 */
export default function JourneySurveillance() {
  const { isPatient, searchMasterId, setSearchMasterId, activeMasterId, current, search } = usePatientData();
  const [selection, setSelection] = useState<PhaseSelection>(null);

  const result = useMemo(
    () => (current?.data ? buildSurveillanceView(current.data.events, current.data.encounters) : null),
    [current],
  );
  const view = result?.status === "ready" ? result.view : null;
  const layout = useMemo(() => (view ? layoutPhaseView(view) : null), [view]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    search(event);
    setSelection(null);
  };

  const viewEvents = view?.lanes.flatMap((lane) => lane.events) ?? [];

  return (
    <section className="space-y-5 text-white">
      <div>
        <h2 className="text-xl font-bold">Post-treatment Surveillance</h2>
        <p className="mt-1 text-sm text-gray-400">
          The events recorded after Treatment completed, arranged by theme. Treatment events, including a response
          assessed after completion, stay on the Treatment tab. This view is drawn from the existing events and is not a
          separate record. Select an event or an encounter line for details.
        </p>
      </div>

      {!isPatient && (
        <PatientScopeForm value={searchMasterId} onChange={setSearchMasterId} onSubmit={handleSearch} buttonLabel="Load Post-treatment Surveillance view" />
      )}

      {isPatient && !activeMasterId && (
        <p role="alert" className="rounded border border-amber-700 bg-amber-950 p-4 text-amber-100">
          This account is not linked to a patient record. Contact an administrator to complete setup.
        </p>
      )}

      {activeMasterId && !current && <p aria-live="polite" className="text-gray-300">Loading…</p>}
      {current?.error && <p role="alert" className="rounded border border-rose-800 bg-rose-950 p-3 text-rose-200">{current.error}</p>}

      {result?.status === "no-treatment" && (
        <p className="rounded border border-gray-700 bg-gray-800 p-4 text-gray-300">
          No treatment event with a date has been recorded, so there is no post-treatment surveillance phase yet.
        </p>
      )}
      {result?.status === "treatment-ongoing" && (
        <p className="rounded border border-gray-700 bg-gray-800 p-4 text-gray-300">
          Treatment is not recorded as completed. Post-treatment surveillance begins once a Treatment Change of type “Treatment
          completed” is recorded; add it from the Timeline tab.
        </p>
      )}
      {result?.status === "no-events-yet" && (
        <p className="rounded border border-gray-700 bg-gray-800 p-4 text-gray-300">
          Treatment completed on {result.completionDay}. No later events have been recorded yet.
        </p>
      )}

      {view && layout && current?.data && (
        <>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>
              Follows Treatment completed on {view.completion.day}. {viewEvents.length} event{viewEvents.length === 1 ? "" : "s"}{" "}
              recorded since; the latest is on {view.latest.day}, {view.daysToLatest} day{view.daysToLatest === 1 ? "" : "s"} after
              completion.
            </li>
            <li>
              {view.firstDiseaseEvent
                ? `The first ${view.firstDiseaseEvent.presentation.label} recorded is on ${view.firstDiseaseEvent.day}, ${view.daysToFirstDiseaseEvent} days after completion.`
                : "No Progression or Recurrence has been recorded."}
            </li>
          </ul>

          <PhaseTimeline
            layout={layout}
            label="Post-treatment surveillance timeline"
            selection={selection}
            onSelectEvent={(uid) => setSelection({ kind: "event", uid })}
            onSelectEncounter={(uid) => setSelection({ kind: "encounter", uid })}
          />

          {view.undated.length > 0 && (
            <p className="text-sm text-amber-200">
              {view.undated.length} event{view.undated.length === 1 ? " has" : "s have"} no date and cannot be placed on
              this timeline. They remain on the Timeline tab.
            </p>
          )}

          <PhaseSelectionDetail
            selection={selection}
            viewEvents={viewEvents}
            connectors={view.encounters}
            allEvents={current.data.events}
            onSelectEvent={(uid) => setSelection({ kind: "event", uid })}
          />
        </>
      )}
    </section>
  );
}
