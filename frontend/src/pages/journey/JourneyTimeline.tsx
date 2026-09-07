import { useEffect, useState } from "react";
import EventCard from "../../components/events/EventCard";
import EventForm from "../../components/events/EventForm";

export default function JourneyTimeline() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // TODO: Replace with backend fetch
    setEvents([
      {
        id: "1",
        date: "2024-01-12",
        type: "Diagnosis",
        title: "Initial Diagnosis",
        summary: "Stage T2, urothelial carcinoma with plasmacytoid variant.",
        details:
          "Initial CT showed bladder wall thickening. Cystoscopy confirmed invasive tumor."
      },
      {
        id: "2",
        date: "2024-02-01",
        type: "Treatment Start",
        title: "EVP Treatment Started",
        summary: "Started enfortumab + pembrolizumab.",
        details: "Cycle 1 Day 1. No complications."
      },
      {
        id: "3",
        date: "2024-03-15",
        type: "Imaging",
        title: "CT Scan",
        summary: "Marked improvement in bladder mass.",
        details: "No lymphadenopathy. No new lesions."
      },
      {
        id: "4",
        date: "2024-04-10",
        type: "Best Response",
        title: "Complete Response",
        summary: "CR confirmed by cystoscopy and CT.",
        details: "No visible tumor. Negative cytology."
      }
    ]);
  }, []);

  const handleSaveEvent = (event) => {
    const newEvent = {
      ...event,
      id: crypto.randomUUID()
    };

    setEvents((prev) => [...prev, newEvent]);
    setShowForm(false);
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.eventDate || b.date) - new Date(a.eventDate || a.date)
  );

  return (
    <div className="text-white p-6 space-y-6">
      <h2 className="text-xl font-bold mb-4">My Journey Timeline</h2>

      {/* Add Event Button */}
      {!showForm && (
        <button
          className="bg-blue-600 px-4 py-2 rounded text-white font-bold mb-6"
          onClick={() => setShowForm(true)}
        >
          + Add Event
        </button>
      )}

      {/* Event Form */}
      {showForm && (
        <EventForm
          onSave={handleSaveEvent}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Timeline */}
      {sortedEvents.map((event) => (
        <div key={event.id}>
          <p className="text-gray-400 mb-2">
            {new Date(event.eventDate || event.date).toLocaleDateString()}
          </p>
          <EventCard event={event} />
        </div>
      ))}
    </div>
  );
}
