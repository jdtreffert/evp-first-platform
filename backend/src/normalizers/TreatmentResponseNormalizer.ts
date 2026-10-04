// src/normalizers/TreatmentResponseNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeTreatmentResponse(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;
  const treatmentName = f.Treatment_Name || null;

  const category = f.Treatment_Response_Category || null;
  const modality = f.Treatment_Response_Modality || null;
  const notes = f.Treatment_Response_Notes || null;

  const eventSummary = category
    ? `Treatment response: ${category}`
    : "Treatment response";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Treatment_Response",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      treatmentName,
      treatmentResponseCategory: category,
      treatmentResponseModality: modality,
      treatmentResponseNotes: notes,
    },

    eventSource: f.Event_Source || null,

    treatmentName,

    treatmentResponseCategory: category,
    treatmentResponseModality: modality,
    treatmentResponseNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
