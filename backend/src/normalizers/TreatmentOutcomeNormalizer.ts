// src/normalizers/TreatmentOutcomeNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeTreatmentOutcome(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const outcome = f.Treatment_Outcome || null;

  const eventSummary = outcome
    ? `Treatment outcome: ${outcome}`
    : "Treatment outcome";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Treatment_Outcome",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      treatmentOutcome: outcome,
    },

    eventSource: f.Event_Source || null,

    treatmentOutcome: outcome,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
