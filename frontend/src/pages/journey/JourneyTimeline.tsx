import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { ingestEvent, queryEvents } from "../../api/events";
import { useAuth } from "../../auth/useAuth";
import EventCard from "../../components/events/EventCard";
import EventForm from "../../components/events/EventForm";

export default function JourneyTimeline() {
  const { user } = useAuth();
  const isPatient = user?.role === "patient";
  const canWrite = user?.role === "patient" || user?.role === "administrator";
  const [searchMasterId, setSearchMasterId] = useState(user?.masterId ?? "");
  const [activeMasterId, setActiveMasterId] = useState(isPatient ? user?.masterId ?? "" : "");
  const [queryVersion, setQueryVersion] = useState(0);
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMasterId) return;
    let active = true;
    const loadTimeline = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await queryEvents(activeMasterId);
        if (active) {
          setEvents(result.events);
          setTotalEvents(result.total);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load events.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadTimeline();
    return () => {
      active = false;
    };
  }, [activeMasterId, queryVersion]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setEvents([]);
    setTotalEvents(0);
    setLoading(true);
    setActiveMasterId(searchMasterId.trim());
    setQueryVersion((version) => version + 1);
  };

  const handleLoadMore = async () => {
    if (!activeMasterId || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await queryEvents(activeMasterId, events.length);
      setEvents((previous) => [...previous, ...result.events]);
      setTotalEvents(result.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load older events.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSave = async (record: Parameters<typeof ingestEvent>[0]) => {
    await ingestEvent(record);
    setShowForm(false);
    try {
      const result = await queryEvents(activeMasterId);
      setEvents(result.events);
      setTotalEvents(result.total);
      setError(null);
    } catch (refreshError) {
      setError(`Event saved, but the timeline could not refresh: ${
        refreshError instanceof Error ? refreshError.message : "unknown error"
      }`);
    }
  };

  return (
    <section className="space-y-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{isPatient ? "My Journey Timeline" : "Patient Timeline"}</h2>
          <p className="mt-1 text-sm text-gray-400">
            Events are stored as validated UnifiedEvents and scoped to one patient record.
          </p>
        </div>
        {canWrite && activeMasterId && !showForm && (
          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
            onClick={() => setShowForm(true)}
          >
            Add event
          </button>
        )}
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
          <button type="submit" className="rounded bg-slate-600 px-4 py-2 font-medium hover:bg-slate-500">Load timeline</button>
        </form>
      )}

      {isPatient && !activeMasterId && (
        <p role="alert" className="rounded border border-amber-700 bg-amber-950 p-4 text-amber-100">
          This account is not linked to a patient record. Contact an administrator to complete setup.
        </p>
      )}

      {error && <p role="alert" className="rounded border border-rose-800 bg-rose-950 p-3 text-rose-200">{error}</p>}

      {showForm && activeMasterId && (
        <EventForm
          masterId={activeMasterId}
          eventSource={isPatient ? "Patient" : user?.role === "administrator" ? "Administrator" : "Clinical team"}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {activeMasterId && !showForm && (
        loading ? (
          <p aria-live="polite" className="text-gray-300">Loading timeline…</p>
        ) : events.length === 0 ? (
          <p className="rounded border border-gray-700 bg-gray-800 p-4 text-gray-300">
            No events have been recorded for this patient yet.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => <EventCard key={event.uid} event={event} />)}
            {events.length < totalEvents && (
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
                className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : `Load older events (${totalEvents - events.length} remaining)`}
              </button>
            )}
          </div>
        )
      )}

      {!isPatient && !activeMasterId && !error && (
        <p className="rounded border border-gray-700 bg-gray-800 p-4 text-gray-300">
          Enter a patient record ID to view its timeline. Results are never loaded without a patient scope.
        </p>
      )}
    </section>
  );
}
