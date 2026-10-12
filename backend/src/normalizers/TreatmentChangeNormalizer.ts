// src/normalizers/TreatmentChangeNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeTreatmentChange(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;
  const regimenDetails = f.Treatment_Regimen_Details || null;

  const changeType = f.Treatment_Change_Type || null;
  const reason = f.Treatment_Change_Reason || null;

  const eventSummary = changeType
    ? `Treatment change: ${changeType}`
    : "Treatment change";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Treatment_Change",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      treatmentRegimenDetails: regimenDetails,
      treatmentChangeType: changeType,
      treatmentChangeReason: reason,
    },

    eventSource: f.Event_Source || null,

    treatmentRegimenDetails: regimenDetails,

    treatmentChangeType: changeType,
    treatmentChangeReason: reason,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
