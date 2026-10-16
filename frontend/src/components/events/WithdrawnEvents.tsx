import { useEffect, useState } from "react";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { queryWithdrawnEvents, restoreEvent } from "../../api/events";

/**
 * Events withdrawn as entered in error. They are kept with their history and left off the timeline and the
 * journey views; this list shows them and, for accounts that may write, restores them.
 */
export default function WithdrawnEvents({
  masterId,
  canRestore,
  version,
  onRestored,
}: {
  masterId: string;
  canRestore: boolean;
  /** Changes when an event has been withdrawn elsewhere, so the list is read again. */
  version: number;
  onRestored: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<UnifiedEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queryWithdrawnEvents(masterId)
      .then((withdrawn) => {
        if (!active) return;
        setEvents(withdrawn);
        setError(null);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load withdrawn events.");
      });
    return () => {
      active = false;
    };
  }, [masterId, version]);

  const restore = async (uid: string) => {
    setRestoring(uid);
    setError(null);
    try {
      await restoreEvent(uid);
      setEvents((previous) => previous?.filter((event) => event.uid !== uid) ?? null);
      await onRestored();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Unable to restore the event.");
    } finally {
      setRestoring(null);
    }
  };

  // Nothing is withdrawn, so there is nothing to show.
  if (events !== null && events.length === 0 && !error) return null;

  return (
    <section className="rounded border border-gray-700 bg-gray-900 p-4">
      <button type="button" className="text-blue-300 underline" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Hide" : "Show"} withdrawn events{events ? ` (${events.length})` : ""}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
      {open && events && (
        <ul className="mt-3 space-y-2 text-sm text-gray-300">
          {events.map((event) => (
            <li key={event.uid} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-700 p-2">
              <span>
                <strong>{event.eventSummary || event.eventType.replaceAll("_", " ")}</strong>
                {event.eventDate ? ` · ${event.eventDate.slice(0, 10)}` : ""}
                {event.withdrawnAt ? ` · withdrawn ${new Date(event.withdrawnAt).toLocaleString()}` : ""}
                {event.withdrawnReason ? ` · ${event.withdrawnReason}` : ""}
              </span>
              {canRestore && (
                <button type="button" disabled={restoring === event.uid} className="text-blue-300 underline disabled:opacity-60" onClick={() => void restore(event.uid)}>
                  {restoring === event.uid ? "Restoring…" : "Restore"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
