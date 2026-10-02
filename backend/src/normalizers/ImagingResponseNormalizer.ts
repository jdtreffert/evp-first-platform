// src/normalizers/ImagingResponseNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeImagingResponse(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const category = f.Imaging_Response_Category || null;
  const criteria = f.Imaging_Response_Criteria || null;
  const targetChange = f.Imaging_Response_Target_Lesion_Change || null;

  const eventSummary = category
    ? `Imaging response: ${category}`
    : "Imaging response";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Imaging_Response",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      imagingResponseCategory: category,
      imagingResponseCriteria: criteria,
      imagingResponseTargetLesionChange: targetChange,
    },

    eventSource: f.Event_Source || null,

    imagingResponseCategory: category,
    imagingResponseCriteria: criteria,
    imagingResponseTargetLesionChange: targetChange,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
