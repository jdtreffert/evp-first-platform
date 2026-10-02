// src/normalizers/TreatmentRegimenDetailsNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeTreatmentRegimenDetails(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

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
      treatmentRegimenDetails: details,
    },

    eventSource: f.Event_Source || null,

    treatmentRegimenDetails: details,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
