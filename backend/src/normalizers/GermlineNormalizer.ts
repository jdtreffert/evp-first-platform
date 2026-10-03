// src/normalizers/GermlineNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeGermline(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const vendor = f.Germline_Vendor || null;
  const findings = f.Germline_Findings || [];
  const pathogenicity = f.Germline_Pathogenicity || null;
  const notes = f.Germline_Notes || null;

  const eventSummary = vendor
    ? `Germline testing: ${vendor}`
    : "Germline testing";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Germline",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      germlineVendor: vendor,
      germlineFindings: findings,
      germlinePathogenicity: pathogenicity,
      germlineNotes: notes,
    },

    eventSource: f.Event_Source || null,

    germlineVendor: vendor,
    germlineFindings: findings,
    germlinePathogenicity: pathogenicity,
    germlineNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
