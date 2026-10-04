// src/normalizers/CystoscopyBiopsyNormalizer.ts

import { pickField } from "../utils/pickField";
import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeCystoscopyBiopsy(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const taken = f.Cystoscopy_Biopsy_Taken || null;
  const result = pickField(f, "Cystoscopy_Biopsy_Result", "Biopsy_Result") || null;
  const site = pickField(f, "Cystoscopy_Biopsy_Site", "Biopsy_Site") || null;
  const notes = pickField(f, "Cystoscopy_Biopsy_Notes", "Biopsy_Notes") || null;

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
      biopsyTaken: taken,
      biopsyResult: result,
      biopsySite: site,
      biopsyNotes: notes,
    },

    eventSource: f.Event_Source || null,

    biopsyTaken: taken,
    biopsyResult: result,
    biopsySite: site,
    biopsyNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
