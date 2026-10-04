// src/normalizers/TreatmentRegimenDetailsNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeTreatmentRegimenDetails(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;
  const treatmentName = f.Treatment_Name || null;

  const details = f.Treatment_Regimen_Details || null;

  const eventSummary = details
    ? `Regimen details updated`
    : "Regimen details";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Treatment_Regimen_Details",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      treatmentName,
      treatmentRegimenDetails: details,
    },

    eventSource: f.Event_Source || null,

    treatmentName,

    treatmentRegimenDetails: details,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
