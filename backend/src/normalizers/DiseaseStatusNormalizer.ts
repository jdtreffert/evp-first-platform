// src/normalizers/DiseaseStatusNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

/**
 * Disease_Status is an explicit, dated assessment recorded by a person or source. This maps what was recorded
 * and nothing more: no field is derived from another field, from the notes, or from any other event, and no
 * other event is created or changed.
 */
export function normalizeDiseaseStatus(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const category = f.Disease_Status_Category || null;
  const extent = f.Disease_Status_Extent || null;
  const basis = f.Disease_Status_Basis || null;
  const confidence = f.Disease_Status_Confidence || null;
  const notes = f.Disease_Status_Notes || null;

  // A supplied summary is kept like any event's; the default is read from the recorded category only.
  const eventSummary = f.Event_Summary
    ? f.Event_Summary
    : category
      ? `Disease status: ${category}`
      : "Disease status";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Disease_Status",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      diseaseStatusCategory: category,
      diseaseStatusExtent: extent,
      diseaseStatusBasis: basis,
      diseaseStatusConfidence: confidence,
      diseaseStatusNotes: notes,
    },

    eventSource: f.Event_Source || null,

    diseaseStatusCategory: category,
    diseaseStatusExtent: extent,
    diseaseStatusBasis: basis,
    diseaseStatusConfidence: confidence,
    diseaseStatusNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
