import { useState } from "react";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";

export default function EventCard({ event }: { event: UnifiedEvent }) {
  const [open, setOpen] = useState(false);
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

        <button
          type="button"
          className="text-blue-300 underline"
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide" : "View"}
        </button>
      </div>

      {event.eventDate && <p className="mt-2 text-sm text-gray-300">{event.eventDate}</p>}
      {event.eventSource && <p className="mt-1 text-xs text-gray-400">Source: {event.eventSource}</p>}

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
