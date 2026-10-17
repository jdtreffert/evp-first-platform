import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import PatientScopeForm from "../../components/journey/PatientScopeForm";
import PhaseSelectionDetail from "../../components/journey/PhaseSelectionDetail";
import PhaseTimeline from "../../components/journey/PhaseTimeline";
import type { PhaseSelection } from "../../components/journey/PhaseTimeline";
import { todayLocal } from "../../journey/calendarDay";
import { describeDiseaseStatus } from "../../journey/diseaseStatus";
import { layoutPhaseView } from "../../journey/phaseLayout";
import { buildSummaryView, describeSummaryDuration } from "../../journey/summaryView";
import { usePatientData } from "./usePatientData";

/**
 * The Journey Summary: the major milestones of a patient's journey across the phases, drawn from the existing
 * events. Read-only and derived; the evidence and delivery events stay in the phase views.
 */
export default function JourneySummary() {
  const { isPatient, searchMasterId, setSearchMasterId, activeMasterId, current, search } = usePatientData();
  const [selection, setSelection] = useState<PhaseSelection>(null);

  const view = useMemo(
    () => (current?.data ? buildSummaryView(current.data.events, current.data.encounters, { today: todayLocal() }) : null),
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
        <h2 className="text-xl font-bold">Journey Summary</h2>
        <p className="mt-1 text-sm text-gray-400">
          The major milestones of the journey, arranged by theme and ending at today. Tests, scans, doses and other
          evidence are not shown here; they are on the Diagnosis, Treatment and Post-treatment Surveillance tabs. This
          view is drawn from the existing events and is not a separate record. Select a milestone for its details.
        </p>
      </div>

      {!isPatient && (
        <PatientScopeForm value={searchMasterId} onChange={setSearchMasterId} onSubmit={handleSearch} buttonLabel="Load Journey Summary" />
      )}

      {isPatient && !activeMasterId && (
        <p role="alert" className="rounded border border-amber-700 bg-amber-950 p-4 text-amber-100">
          This account is not linked to a patient record. Contact an administrator to complete setup.
        </p>
      )}

      {activeMasterId && !current && <p aria-live="polite" className="text-gray-300">Loading…</p>}
      {current?.error && <p role="alert" className="rounded border border-rose-800 bg-rose-950 p-3 text-rose-200">{current.error}</p>}

      {view && layout && current?.data && (
        <>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>
              {view.empty
                ? "No milestone with a date has been recorded yet."
                : `${view.milestones.length} milestone${view.milestones.length === 1 ? "" : "s"} recorded.`}
            </li>
            <li>{describeDiseaseStatus(view.diseaseStatus)}</li>
            {view.durations.map((duration) => (
              <li key={duration.id}>{describeSummaryDuration(duration)}</li>
            ))}
          </ul>

          {!view.empty && (
            <PhaseTimeline
              layout={layout}
              label="Journey Summary timeline"
              selection={selection}
              onSelectEvent={(uid) => setSelection({ kind: "event", uid })}
              onSelectEncounter={(uid) => setSelection({ kind: "encounter", uid })}
            />
          )}

          {view.undated.length > 0 && (
            <p className="text-sm text-amber-200">
              {view.undated.length} milestone event{view.undated.length === 1 ? " has" : "s have"} no valid date and cannot be
              placed on this timeline. They remain on the Timeline tab.
            </p>
          )}

          <PhaseSelectionDetail
            selection={selection}
            viewEvents={viewEvents}
            connectors={view.encounters}
            allEvents={current.data.events}
            onSelectEvent={(uid) => setSelection({ kind: "event", uid })}
            scopeName="summary"
          />
        </>
      )}
    </section>
  );
}
