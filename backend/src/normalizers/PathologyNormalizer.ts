// src/normalizers/PathologyNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizePathology(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const histology = f.Pathology_Histology || null;
  const grade = f.Pathology_Grade || null;
  const variants = f.Pathology_Variant_Histology || [];
  const depth = f.Pathology_Depth || null;
  const margins = f.Pathology_Margins || null;
  const lvi = f.Pathology_LVI || null;
  const notes = f.Pathology_Notes || null;
  const reportDate = f.Pathology_Report_Date || null;

  const eventSummary = histology && grade
    ? `Pathology: ${histology}, Grade ${grade}`
    : "Pathology report";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Pathology",
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
      pathologyReportDate: reportDate,
    },

    eventSource: f.Event_Source || null,

    pathologyHistology: histology,
    pathologyGrade: grade,
    pathologyVariantHistology: variants,
    pathologyDepth: depth,
    pathologyMargins: margins,
    pathologyLVI: lvi,
    pathologyNotes: notes,
    pathologyReportDate: reportDate,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
