// src/normalizers/NoteNormalizer.ts

import { pickField } from "../utils/pickField";
import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeNote(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const notes = pickField(f, "Event_Details", "Note_Text") || null;

  const eventSummary = f.Event_Summary ? f.Event_Summary : notes
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

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
