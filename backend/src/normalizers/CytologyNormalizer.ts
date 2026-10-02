// src/normalizers/CytologyNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeCytology(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const result = f.Cytology_Result || null;
  const category = f.Cytology_Category || null;
  const specimen = f.Cytology_Specimen || null;
  const notes = f.Cytology_Notes || null;

  const eventSummary = result
    ? `Cytology: ${result}`
    : "Cytology result";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Cytology",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      cytologyResult: result,
      cytologyCategory: category,
      cytologySpecimen: specimen,
      cytologyNotes: notes,
    },

    eventSource: f.Event_Source || null,

    cytologyResult: result,
    cytologyCategory: category,
    cytologySpecimen: specimen,
    cytologyNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}