// src/normalizers/CystoscopyNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeCystoscopy(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const findings = f.Cystoscopy_Findings || null;
  const visibility = f.Cystoscopy_Visibility || null;
  const reason = f.Cystoscopy_Reason || null;
  const notes = f.Cystoscopy_Notes || null;

  const eventSummary = findings
    ? `Cystoscopy: ${findings}`
    : "Cystoscopy";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Cystoscopy",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      cystoscopyFindings: findings,
      cystoscopyVisibility: visibility,
      cystoscopyReason: reason,
      cystoscopyNotes: notes,
    },

    eventSource: f.Event_Source || null,

    cystoscopyFindings: findings,
    cystoscopyVisibility: visibility,
    cystoscopyReason: reason,
    cystoscopyNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
  