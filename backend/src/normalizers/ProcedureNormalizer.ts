// src/normalizers/ProcedureNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeProcedure(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const type = f.Procedure_Type || null;
  const result = f.Procedure_Result || null;
  const notes = f.Procedure_Notes || null;

  const eventSummary = type
    ? `Procedure: ${type}`
    : "Procedure";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Procedure",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      procedureType: type,
      procedureResult: result,
      procedureNotes: notes,
    },

    eventSource: f.Event_Source || null,

    procedureType: type,
    procedureResult: result,
    procedureNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
