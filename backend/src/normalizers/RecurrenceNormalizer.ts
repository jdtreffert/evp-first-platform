// src/normalizers/RecurrenceNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeRecurrence(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const location = f.Recurrence_Location || null;
  const spread = f.Recurrence_Spread_Category || null;
  const modality = f.Recurrence_Modality || null;
  const confirmation = f.Recurrence_Confirmation || null;
  const notes = f.Recurrence_Notes || null;

  const eventSummary = location
    ? `Recurrence: ${location}`
    : "Recurrence event";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Recurrence",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      recurrenceLocation: location,
      recurrenceSpreadCategory: spread,
      recurrenceModality: modality,
      recurrenceConfirmation: confirmation,
      recurrenceNotes: notes,
    },

    eventSource: f.Event_Source || null,

    recurrenceLocation: location,
    recurrenceSpreadCategory: spread,
    recurrenceModality: modality,
    recurrenceConfirmation: confirmation,
    recurrenceNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
