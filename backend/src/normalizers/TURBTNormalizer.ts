// src/normalizers/TURBTNormalizer.ts

import { pickField } from "../utils/pickField";
import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeTURBT(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const histology = pickField(f, "TURBT_Histology", "Pathology_Histology") || null;
  const grade = pickField(f, "TURBT_Grade", "Pathology_Grade") || null;
  const depth = pickField(f, "TURBT_Depth", "Pathology_Depth") || null;
  const margins = pickField(f, "TURBT_Margins", "Pathology_Margins") || null;
  const lvi = pickField(f, "TURBT_LVI", "Pathology_LVI") || null;
  const variants = pickField(f, "TURBT_Variant_Histology", "Pathology_Variant_Histology") || [];
  const notes = pickField(f, "TURBT_Notes", "Pathology_Notes") || null;
  const completeness = f.TURBT_Completeness || null;
  const surgeonNotes = f.TURBT_Surgeion_Notes || null;
  const specimenNotes = f.TURBT_Specimen_Notes || null;

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
      turbtCompleteness: completeness,
      turbtSurgeonNotes: surgeonNotes,
      turbtSpecimenNotes: specimenNotes,
    },

    eventSource: f.Event_Source || null,

    pathologyHistology: histology,
    pathologyGrade: grade,
    pathologyVariantHistology: variants,
    pathologyDepth: depth,
    pathologyMargins: margins,
    pathologyLVI: lvi,
    pathologyNotes: notes,
    turbtCompleteness: completeness,
    turbtSurgeonNotes: surgeonNotes,
    turbtSpecimenNotes: specimenNotes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
