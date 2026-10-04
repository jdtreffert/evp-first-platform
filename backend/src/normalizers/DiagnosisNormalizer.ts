import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeDiagnosis(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const histology = f.Diagnosis_Histology || null;
  const grade = f.Diagnosis_Grade || null;
  const variants = f.Diagnosis_Variant_Histology || [];
  const depth = f.Diagnosis_Depth || null;
  const margins = f.Diagnosis_Margins || null;
  const lvi = f.Diagnosis_LVI || null;
  const notes = f.Diagnosis_Notes || null;
  const initialPresentation = f.Diagnosis_Initial_Presentation || null;
  const t = f.T || null;
  const n = f.N || null;
  const m = f.M || null;
  const stage = f.Stage || null;

  const eventSummary = histology && grade
    ? `Diagnosis: ${histology}, Grade ${grade}`
    : histology
      ? `Diagnosis: ${histology}`
      : "Diagnosis event";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Diagnosis",
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
      diagnosisInitialPresentation: initialPresentation,
      tumorT: t,
      tumorN: n,
      tumorM: m,
      tumorStage: stage,
    },

    eventSource: f.Event_Source || null,

    pathologyHistology: histology,
    pathologyGrade: grade,
    pathologyVariantHistology: variants,
    pathologyDepth: depth,
    pathologyMargins: margins,
    pathologyLVI: lvi,
    pathologyNotes: notes,

    diagnosisInitialPresentation: initialPresentation,
    tumorT: t,
    tumorN: n,
    tumorM: m,
    tumorStage: stage,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
