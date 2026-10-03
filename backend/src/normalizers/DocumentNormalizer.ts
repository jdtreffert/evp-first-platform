// src/normalizers/DocumentNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeDocument(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const attachments = f.Document_Attachment || [];
  const docType = f.Document_Type || null;
  const redaction = f.Document_Redaction_Status || null;

  const eventSummary = docType
    ? `Document: ${docType}`
    : "Document";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Document",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      documentAttachment: attachments,
      documentType: docType,
      documentRedactionStatus: redaction,
    },

    eventSource: f.Event_Source || null,

    documentAttachment: attachments,
    documentType: docType,
    documentRedactionStatus: redaction,

    payload: raw,
  };
}
