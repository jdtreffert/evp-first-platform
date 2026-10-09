// src/normalizers/TreatmentDeliveryNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeTreatmentDelivery(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const name = f.Treatment_Name || null;
  const cycle = f.Treatment_Cycle ?? null;
  const route = f.Treatment_Route || null;
  const dose = f.Treatment_Dose ?? null;
  const doseUnits = f.Treatment_Dose_Units || null;
  const status = f.Treatment_Delivery_Status || null;
  const notes = f.Treatment_Delivery_Notes || null;

  const eventSummary = name
    ? `Treatment delivery: ${name}`
    : "Treatment delivery";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Treatment_Delivery",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      treatmentName: name,
      treatmentCycle: cycle,
      treatmentRoute: route,
      treatmentDose: dose,
      treatmentDoseUnits: doseUnits,
      treatmentDeliveryStatus: status,
      treatmentDeliveryNotes: notes,
    },

    eventSource: f.Event_Source || null,

    treatmentName: name,
    treatmentCycle: cycle,
    treatmentRoute: route,
    treatmentDose: dose,
    treatmentDoseUnits: doseUnits,
    treatmentDeliveryStatus: status,
    treatmentDeliveryNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
