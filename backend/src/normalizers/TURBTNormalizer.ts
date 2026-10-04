// src/normalizers/TURBTNormalizer.ts

import { pickField } from "../utils/pickField";
import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

/** The procedure itself; its pathology results are recorded in a linked Pathology event. */
export function normalizeTURBT(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const completeness = f.TURBT_Completeness || null;
  const surgeonNotes = pickField(f, "TURBT_Surgeon_Notes", "TURBT_Surgeion_Notes") || null;
  const specimenNotes = f.TURBT_Specimen_Notes || null;

  const eventSummary = completeness ? `TURBT: ${completeness} resection` : "TURBT";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "TURBT",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      turbtCompleteness: completeness,
      turbtSurgeonNotes: surgeonNotes,
      turbtSpecimenNotes: specimenNotes,
    },

    eventSource: f.Event_Source || null,

    turbtCompleteness: completeness,
    turbtSurgeonNotes: surgeonNotes,
    turbtSpecimenNotes: specimenNotes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
