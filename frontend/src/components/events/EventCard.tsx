import { useState } from "react";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import DocumentLink from "./DocumentLink";
import EventHistory from "./EventHistory";

export default function EventCard({
  event,
  related,
  onEdit,
}: {
  event: UnifiedEvent;
  related?: UnifiedEvent;
  /** Present only when the signed-in user may edit this event. */
  onEdit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const details = event.eventDetails
    ? Object.entries(event.eventDetails).filter(([, value]) => value !== null && value !== "")
    : [];

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
          <button
            type="button"
            className="text-blue-300 underline"
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide" : "View"}
          </button>
        </div>
      </div>

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
          {details.map(([key, value]) => (
            <div key={key}>
              <dt className="font-medium capitalize text-gray-400">{key.replaceAll(/([A-Z])/g, " $1")}</dt>
              <dd className="whitespace-pre-line">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
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
