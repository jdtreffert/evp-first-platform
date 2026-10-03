// src/normalizers/SymptomNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeSymptom(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const description = f.Symptom_Description || null;
  const type = f.Symptom_Type || null;
  const severity = f.Symptom_Severity || null;
  const duration = f.Symptom_Duration || null;
  const durationUnits = f.Symptom_Duration_Units || null;

  const eventSummary = description
    ? `Symptom: ${description}`
    : "Symptom event";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Symptom",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      symptomDescription: description,
      symptomType: type,
      symptomSeverity: severity,
      symptomDuration: duration,
      symptomDurationUnits: durationUnits,
    },

    eventSource: f.Event_Source || null,

    symptomDescription: description,
    symptomType: type,
    symptomSeverity: severity,
    symptomDuration: duration,
    symptomDurationUnits: durationUnits,

    payload: raw,
  };
}
