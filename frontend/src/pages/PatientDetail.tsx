import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import EventForm from "../components/events/EventForm";

interface EventRecord {
  id: string;
  eventType: string;
  eventDate: string;
  eventSummary: string;
  eventDetails: any;
  sourceDocumentURL: string;
  createdAt: string;
}

export default function PatientDetail() {
  const { masterId } = useParams();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${masterId}`);
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, [masterId]);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Patient Details</h1>

      {/* Event Form */}
      <EventForm masterId={masterId!} onSuccess={fetchEvents} />

      <h2 className="text-xl font-semibold mt-10 mb-4">Events</h2>

      {loading ? (
        <p>Loading events...</p>
      ) : events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <div key={ev.id} className="p-4 bg-gray-700 rounded">
              <div className="font-semibold">{ev.eventType}</div>
              <div className="text-sm text-gray-300">{ev.eventDate}</div>
              <div className="mt-2">{ev.eventSummary}</div>

              {ev.sourceDocumentURL && (
                <a
                  href={ev.sourceDocumentURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline block mt-2"
                >
                  Source Document
                </a>
              )}

              <div className="text-xs text-gray-400 mt-2">
                Created: {ev.createdAt}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
