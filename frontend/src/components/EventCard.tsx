import { useState } from "react";

export default function EventCard({ event }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gray-800 p-4 rounded mb-4 border border-gray-700">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-lg font-bold">{event.title}</h4>
          <p className="text-sm text-gray-400">{event.type}</p>
        </div>

        <button
          className="text-blue-300 underline"
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide" : "View"}
        </button>
      </div>

      <p className="mt-2">{event.summary}</p>

      {open && event.details && (
        <div className="mt-4 text-sm text-gray-300 whitespace-pre-line">
          {event.details}
        </div>
      )}
    </div>
  );
}
