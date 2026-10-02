// src/normalizers/TURBTNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeTURBT(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const histology = f.Pathology_Histology || null;
  const grade = f.Pathology_Grade || null;
  const depth = f.Pathology_Depth || null;
  const margins = f.Pathology_Margins || null;
  const lvi = f.Pathology_LVI || null;
  const variants = f.Pathology_Variant_Histology || [];
  const notes = f.Pathology_Notes || null;

  const eventSummary = histology && grade
    ? `TURBT: ${histology}, Grade ${grade}`
    : "TURBT pathology";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "TURBT",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      pathologyHistology: histology,
      pathologyGrade: grade,
      pathologyVariantHistology: variants,
      pathologyDepth: depth,
      pathologyMargins: margins,
      pathologyLVI: lvi,
      pathologyNotes: notes,
    },

    eventSource: f.Event_Source || null,

    pathologyHistology: histology,
    pathologyGrade: grade,
    pathologyVariantHistology: variants,
    pathologyDepth: depth,
    pathologyMargins: margins,
    pathologyLVI: lvi,
    pathologyNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
