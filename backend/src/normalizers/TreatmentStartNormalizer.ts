// src/normalizers/TreatmentStartNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeTreatmentStart(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;
  const regimenDetails = f.Treatment_Regimen_Details || null;

  const name = f.Treatment_Name || null;
  const cycle = f.Treatment_Cycle ?? null;
  const intent = f.Treatment_Intent || null;
  const recommendation = f.Treatment_Physician_Recommendation || null;
  const preference = f.Treatment_Patient_Preference || null;
  const route = f.Treatment_Route || null;

  const eventSummary = name
    ? `Treatment start: ${name}`
    : "Treatment start";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Treatment_Start",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      treatmentRegimenDetails: regimenDetails,
      treatmentName: name,
      treatmentCycle: cycle,
      treatmentIntent: intent,
      treatmentPhysicianRecommendation: recommendation,
      treatmentPatientPreference: preference,
      treatmentRoute: route,
    },

    eventSource: f.Event_Source || null,

    treatmentName: name,
    treatmentRegimenDetails: regimenDetails,
    treatmentCycle: cycle,
    treatmentIntent: intent,
    treatmentPhysicianRecommendation: recommendation,
    treatmentPatientPreference: preference,
    treatmentRoute: route,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
