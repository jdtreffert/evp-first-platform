import { useState } from "react";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import DocumentLink from "./DocumentLink";
import EventHistory from "./EventHistory";
import { detailRows } from "./eventDetails";
import { encounterLabel } from "./encounterOptions";
import type { Encounter } from "../../../../backend/src/types/Encounter";

export default function EventCard({
  event,
  related,
  encounter,
  hideEncounter = false,
  onEditEncounter,
  onEdit,
  onWithdraw,
}: {
  event: UnifiedEvent;
  related?: UnifiedEvent;
  /** The encounter this event links to, when it has been loaded. */
  encounter?: Encounter;
  /** True when the card is shown under its encounter, which is then displayed once by the group instead. */
  hideEncounter?: boolean;
  /** Present only when the signed-in user may edit encounters. */
  onEditEncounter?: () => void;
  /** Present only when the signed-in user may edit this event. */
  onEdit?: () => void;
  /** Present only when the signed-in user may withdraw this event as entered in error. */
  onWithdraw?: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [reason, setReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const details = detailRows(event);

  const withdraw = async () => {
    if (!onWithdraw) return;
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      await onWithdraw(reason.trim());
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : "Unable to withdraw the event.");
      setWithdrawing(false);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded mb-4 border border-gray-700">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-lg font-bold">{event.eventSummary || event.eventType}</h4>
          <p className="text-sm text-gray-400">{event.eventType.replaceAll("_", " ")}</p>
        </div>

        <div className="flex gap-4">
          {onEdit && (
            <button type="button" className="text-blue-300 underline" onClick={onEdit}>
              Edit
            </button>
          )}
          {onWithdraw && !confirmingWithdraw && (
            <button type="button" className="text-blue-300 underline" onClick={() => setConfirmingWithdraw(true)}>
              Withdraw
            </button>
          )}
          <button
            type="button"
            className="text-blue-300 underline"
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide" : "View"}
          </button>
        </div>
      </div>

      {confirmingWithdraw && (
        <div role="group" aria-label="Withdraw event" className="mt-3 space-y-2 rounded border border-amber-700 bg-amber-950 p-3 text-sm text-amber-100">
          <p>
            Withdraw this event as entered in error, for example a duplicate? It is kept in the history and listed under
            Withdrawn events, where it can be restored, but it no longer appears on the timeline or in the journey views.
          </p>
          <label className="block">
            <span className="text-xs text-amber-200">Reason (optional)</span>
            <input
              type="text"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border border-amber-800 bg-gray-900 p-2 text-white"
            />
          </label>
          {withdrawError && <p role="alert" className="text-rose-200">{withdrawError}</p>}
          <div className="flex gap-3">
            <button type="button" disabled={withdrawing} onClick={() => void withdraw()} className="rounded bg-amber-700 px-3 py-1 text-white disabled:opacity-60">
              {withdrawing ? "Withdrawing…" : "Withdraw event"}
            </button>
            <button type="button" disabled={withdrawing} onClick={() => { setConfirmingWithdraw(false); setWithdrawError(null); }} className="text-blue-300 underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {event.eventDate && <p className="mt-2 text-sm text-gray-300">{event.eventDate}</p>}
      {event.lastModifiedAt && (
        <p className="mt-1 text-xs text-gray-400">
          Edited {new Date(event.lastModifiedAt).toLocaleString()}{" "}
          <button type="button" className="text-blue-300 underline" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? "Hide history" : "History"}
          </button>
        </p>
      )}
      {showHistory && <EventHistory event={event} />}
      {event.eventSource && <p className="mt-1 text-xs text-gray-400">Source: {event.eventSource}</p>}

      {!hideEncounter && event.encounterUid && (
        <p className="mt-1 text-xs text-gray-400">
          Encounter: {encounter ? encounterLabel(encounter) : "unavailable"}{" "}
          {encounter && onEditEncounter && (
            <button type="button" className="text-blue-300 underline" onClick={onEditEncounter}>
              Edit encounter
            </button>
          )}
        </p>
      )}
      {!hideEncounter && encounter && (encounter.documentAttachment ?? []).length > 0 && (
        <div className="mt-1">
          <p className="text-xs text-gray-400">
            Encounter documents{encounter.documentType ? ` (${encounter.documentType})` : ""}:
          </p>
          {(encounter.documentAttachment ?? []).map((id) => <DocumentLink key={id} documentId={id} />)}
        </div>
      )}
      {related && (
        <p className="mt-1 text-xs text-gray-400">
          {(event.eventRelationship ?? "Related_To").replaceAll("_", " ")}: {related.eventType.replaceAll("_", " ")}
          {related.eventDate ? ` on ${related.eventDate.slice(0, 10)}` : ""}
        </p>
      )}
      {(event.documentAttachment ?? []).map((id) => <DocumentLink key={String(id)} documentId={String(id)} />)}
      {event.documentType && (event.documentAttachment ?? []).length > 0 && (
        <p className="text-xs text-gray-400">Document type: {event.documentType}</p>
      )}

      {open && details.length > 0 && (
        <dl className="mt-4 space-y-2 border-t border-gray-700 pt-4 text-sm text-gray-300">
          {details.map(({ key, label, value }) => (
            <div key={key}>
              <dt className="font-medium capitalize text-gray-400">{label}</dt>
              <dd className="whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {open && details.length === 0 && (
        <p className="mt-4 border-t border-gray-700 pt-4 text-sm text-gray-400">
          No additional details were recorded.
        </p>
      )}
    </div>
  );
}
