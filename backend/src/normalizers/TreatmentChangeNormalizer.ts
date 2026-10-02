// src/normalizers/TreatmentChangeNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeTreatmentChange(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const changeType = f.Treatment_Change_Type || null;
  const reason = f.Treatment_Change_Reason || null;
  const newRegimen = f.Treatment_Change_New_Regimen || null;
  const toxicityGrade = f.Treatment_Change_Toxicity_Grade || null;

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
      treatmentChangeType: changeType,
      treatmentChangeReason: reason,
      treatmentChangeNewRegimen: newRegimen,
      treatmentChangeToxicityGrade: toxicityGrade,
    },

    eventSource: f.Event_Source || null,

    treatmentChangeType: changeType,
    treatmentChangeReason: reason,
    treatmentChangeNewRegimen: newRegimen,
    treatmentChangeToxicityGrade: toxicityGrade,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
