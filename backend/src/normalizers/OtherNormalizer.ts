// src/normalizers/OtherNormalizer.ts

import { pickField } from "../utils/pickField";
import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeOther(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const description = pickField(f, "Event_Details", "Other_Description") || null;

  const eventSummary = f.Event_Summary ? f.Event_Summary : description
    ? `Other: ${description}`
    : "Other event";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Other",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      otherDescription: description,
    },

    eventSource: f.Event_Source || null,

    otherDescription: description,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
