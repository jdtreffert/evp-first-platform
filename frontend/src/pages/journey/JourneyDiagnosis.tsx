import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { listEncounters } from "../../api/encounters";
import { queryAllEvents } from "../../api/events";
import { useAuth } from "../../auth/useAuth";
import EventCard from "../../components/events/EventCard";
import { encounterLabel } from "../../components/events/encounterOptions";
import DiagnosisTimeline from "../../components/journey/DiagnosisTimeline";
import type { DiagnosisSelection } from "../../components/journey/DiagnosisTimeline";
import EncounterGroupCard from "../../components/journey/EncounterGroupCard";
import { layoutDiagnosisView } from "../../journey/diagnosisLayout";
import { buildDiagnosisView } from "../../journey/diagnosisView";

interface PatientData {
  events: UnifiedEvent[];
  encounters: Encounter[];
}

/** The Diagnosis phase of a patient's journey, drawn from their existing events: read-only and derived. */
export default function JourneyDiagnosis() {
  const { user } = useAuth();
  const isPatient = user?.role === "patient";
  const [searchMasterId, setSearchMasterId] = useState(user?.masterId ?? "");
  const [activeMasterId, setActiveMasterId] = useState(isPatient ? user?.masterId ?? "" : "");
  const [loaded, setLoaded] = useState<{ masterId: string; data: PatientData | null; error: string | null } | null>(null);
  const [diagnosisUid, setDiagnosisUid] = useState<string | undefined>(undefined);
  const [selection, setSelection] = useState<DiagnosisSelection>(null);

  useEffect(() => {
    if (!activeMasterId) return;
    let active = true;
    Promise.all([queryAllEvents(activeMasterId), listEncounters(activeMasterId).catch(() => [] as Encounter[])])
      .then(([events, encounters]) => { if (active) setLoaded({ masterId: activeMasterId, data: { events, encounters }, error: null }); })
      .catch((loadError: unknown) => {
        if (active) {
          setLoaded({
            masterId: activeMasterId,
            data: null,
            error: loadError instanceof Error ? loadError.message : "Unable to load events.",
          });
        }
      });
    return () => { active = false; };
  }, [activeMasterId]);

  const current = loaded && loaded.masterId === activeMasterId ? loaded : null;
  const view = useMemo(
    () => (current?.data ? buildDiagnosisView(current.data.events, current.data.encounters, { diagnosisUid }) : null),
    [current, diagnosisUid],
  );
  const layout = useMemo(() => (view ? layoutDiagnosisView(view) : null), [view]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelection(null);
    setDiagnosisUid(undefined);
    setActiveMasterId(searchMasterId.trim());
  };

  const viewEvents = view?.lanes.flatMap((lane) => lane.events) ?? [];
  const selectedEvent = selection?.kind === "event" ? viewEvents.find((item) => item.event.uid === selection.uid) : undefined;
  const selectedConnector = selection?.kind === "encounter"
    ? view?.encounters.find((connector) => connector.encounter.uid === selection.uid)
    : undefined;

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
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 rounded border border-gray-700 bg-gray-800 p-4">
          <label className="min-w-56 flex-1 text-sm">
            Patient record ID
            <input
              required
              className="mt-1 w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
              value={searchMasterId}
              onChange={(event) => setSearchMasterId(event.target.value)}
              placeholder="Enter a patient master ID"
            />
          </label>
          <button type="submit" className="rounded bg-slate-600 px-4 py-2 font-medium hover:bg-slate-500">Load Diagnosis view</button>
        </form>
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

      {view && layout && (
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

          <DiagnosisTimeline
            layout={layout}
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

          {selectedEvent && (
            <EventCard
              event={selectedEvent.event}
              encounter={selectedEvent.encounter ?? undefined}
              related={selectedEvent.event.relatedEventUid ? current?.data?.events.find((other) => other.uid === selectedEvent.event.relatedEventUid) : undefined}
            />
          )}

          {selectedConnector && (
            <EncounterGroupCard group={{ encounter: selectedConnector.encounter, events: selectedConnector.members.map((member) => member.event) }}>
              {selectedConnector.members.map((member) => (
                <button
                  key={member.event.uid}
                  type="button"
                  className="block text-left text-sm text-blue-300 underline"
                  onClick={() => setSelection({ kind: "event", uid: member.event.uid })}
                >
                  {member.day} · {member.presentation.label}{member.event.eventSummary ? ` · ${member.event.eventSummary}` : ""}
                </button>
              ))}
              {selectedConnector.outsideCount > 0 && (
                <p className="text-xs text-gray-400">
                  {selectedConnector.outsideCount} more event{selectedConnector.outsideCount === 1 ? "" : "s"} in this
                  encounter fall after the Diagnosis and appear in later phases.
                </p>
              )}
              <p className="text-xs text-gray-500">{encounterLabel(selectedConnector.encounter)}</p>
            </EncounterGroupCard>
          )}
        </>
      )}
    </section>
  );
}
