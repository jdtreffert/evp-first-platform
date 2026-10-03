// src/normalizers/CystoscopyBiopsyNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeCystoscopyBiopsy(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const result = f.Biopsy_Result || null;
  const site = f.Biopsy_Site || null;
  const notes = f.Biopsy_Notes || null;

  const eventSummary = result
    ? `Biopsy: ${result}`
    : "Cystoscopy biopsy";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Cystoscopy_Biopsy",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      biopsyResult: result,
      biopsySite: site,
      biopsyNotes: notes,
    },

    eventSource: f.Event_Source || null,

    biopsyResult: result,
    biopsySite: site,
    biopsyNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
