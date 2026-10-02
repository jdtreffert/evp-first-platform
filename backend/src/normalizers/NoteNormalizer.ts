// src/normalizers/NoteNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeNote(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const notes = f.Note_Text || null;

  const eventSummary = notes
    ? `Note: ${notes.substring(0, 40)}...`
    : "Clinical note";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Note",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      noteText: notes,
    },

    eventSource: f.Event_Source || null,

    noteText: notes,

    payload: raw,
  };
}
