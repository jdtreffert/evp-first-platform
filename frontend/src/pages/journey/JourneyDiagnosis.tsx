import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import PatientScopeForm from "../../components/journey/PatientScopeForm";
import PhaseSelectionDetail from "../../components/journey/PhaseSelectionDetail";
import PhaseTimeline from "../../components/journey/PhaseTimeline";
import type { PhaseSelection } from "../../components/journey/PhaseTimeline";
import { buildDiagnosisView } from "../../journey/diagnosisView";
import { layoutPhaseView } from "../../journey/phaseLayout";
import { usePatientData } from "./usePatientData";

/** The Diagnosis phase of a patient's journey, drawn from their existing events: read-only and derived. */
export default function JourneyDiagnosis() {
  const { isPatient, searchMasterId, setSearchMasterId, activeMasterId, current, search } = usePatientData();
  const [diagnosisUid, setDiagnosisUid] = useState<string | undefined>(undefined);
  const [selection, setSelection] = useState<PhaseSelection>(null);

  const view = useMemo(
    () => (current?.data ? buildDiagnosisView(current.data.events, current.data.encounters, { diagnosisUid }) : null),
    [current, diagnosisUid],
  );
  const layout = useMemo(() => (view ? layoutPhaseView(view) : null), [view]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    search(event);
    setSelection(null);
    setDiagnosisUid(undefined);
  };

  const viewEvents = view?.lanes.flatMap((lane) => lane.events) ?? [];

  return (
    <section className="space-y-5 text-white">
      <div>
        <h2 className="text-xl font-bold">Diagnosis</h2>
        <p className="mt-1 text-sm text-gray-400">
          The events recorded up to the Diagnosis, arranged by theme. This view is drawn from the existing events and
          is not a separate record. Select an event or an encounter line for details.
        </p>
      </div>

      {!isPatient && (
        <PatientScopeForm value={searchMasterId} onChange={setSearchMasterId} onSubmit={handleSearch} buttonLabel="Load Diagnosis view" />
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
          No Diagnosis event with a date has been recorded yet. Add one from the Timeline tab to see this view.
        </p>
      )}

      {view && layout && current?.data && (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-300">
            <span>
              {viewEvents.length} event{viewEvents.length === 1 ? "" : "s"} from {view.range.start} to {view.range.end}
            </span>
            {view.diagnosisCandidates.length > 1 && (
              <label className="flex items-center gap-2">
                Built around the Diagnosis of
                <select
                  className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-white"
                  value={view.milestone.event.uid}
                  onChange={(event) => { setDiagnosisUid(event.target.value); setSelection(null); }}
                >
                  {view.diagnosisCandidates.map((candidate) => (
                    <option key={candidate.uid} value={candidate.uid}>{candidate.eventDate?.slice(0, 10)}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <PhaseTimeline
            layout={layout}
            label="Diagnosis timeline"
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
