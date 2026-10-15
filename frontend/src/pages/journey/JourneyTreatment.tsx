import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import PatientScopeForm from "../../components/journey/PatientScopeForm";
import PhaseSelectionDetail from "../../components/journey/PhaseSelectionDetail";
import PhaseTimeline from "../../components/journey/PhaseTimeline";
import type { PhaseSelection } from "../../components/journey/PhaseTimeline";
import { buildTreatmentView } from "../../journey/treatmentView";
import { layoutPhaseView } from "../../journey/phaseLayout";
import { usePatientData } from "./usePatientData";

/**
 * The treatment course of a patient's journey, drawn from their existing events: read-only and derived. It
 * holds every treatment event and the other events after the Diagnosis, up to the recorded "Treatment completed".
 */
export default function JourneyTreatment() {
  const { isPatient, searchMasterId, setSearchMasterId, activeMasterId, current, search } = usePatientData();
  const [selection, setSelection] = useState<PhaseSelection>(null);

  const view = useMemo(
    () => (current?.data ? buildTreatmentView(current.data.events, current.data.encounters) : null),
    [current],
  );
  const layout = useMemo(() => (view ? layoutPhaseView(view) : null), [view]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    search(event);
    setSelection(null);
  };

  const viewEvents = view?.lanes.flatMap((lane) => lane.events) ?? [];

  return (
    <section className="space-y-5 text-white">
      <div>
        <h2 className="text-xl font-bold">Treatment</h2>
        <p className="mt-1 text-sm text-gray-400">
          The treatment course: every treatment event, and the other events after the Diagnosis, up to the recorded
          Treatment completed. Diamonds mark where evidence became a decision or conclusion, such as the start, a
          change, a response or the completion. This view is drawn from the existing events and is not a separate
          record. Select an event or an encounter line for details.
        </p>
      </div>

      {!isPatient && (
        <PatientScopeForm value={searchMasterId} onChange={setSearchMasterId} onSubmit={handleSearch} buttonLabel="Load Treatment view" />
      )}

      {isPatient && !activeMasterId && (
        <p role="alert" className="rounded border border-amber-700 bg-amber-950 p-4 text-amber-100">
          This account is not linked to a patient record. Contact an administrator to complete setup.
        </p>
      )}

      {activeMasterId && !current && <p aria-live="polite" className="text-gray-300">Loading…</p>}
      {current?.error && <p role="alert" className="rounded border border-rose-800 bg-rose-950 p-3 text-rose-200">{current.error}</p>}

      {current?.data && !view && (
        <p className="rounded border border-gray-700 bg-gray-800 p-4 text-gray-300">
          No treatment event with a date has been recorded yet. Add a Treatment Start from the Timeline tab to see this view.
        </p>
      )}

      {view && layout && current?.data && (
        <>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>
              {viewEvents.length} event{viewEvents.length === 1 ? "" : "s"} from {view.range.start} to {view.range.end}
            </li>
            <li>
              {view.diagnosis
                ? `Follows the Diagnosis of ${view.diagnosis.day}.`
                : "No Diagnosis is recorded, so this starts at the first treatment event."}
            </li>
            <li>
              {view.completion
                ? `Ends with Treatment completed on ${view.completion.day}.`
                : "Treatment is ongoing: no Treatment completed has been recorded."}
            </li>
          </ul>

          <PhaseTimeline
            layout={layout}
            label="Treatment timeline"
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
