// src/normalizers/DecisionNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeDecision(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const type = f.Decision_Type || null;
  const consensus = f.Decision_Consensus || null;
  const notes = f.Decision_Notes || null;

  const eventSummary = type && consensus
    ? `Decision: ${type} (${consensus})`
    : "Clinical decision";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Decision",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      decisionType: type,
      decisionConsensus: consensus,
      decisionNotes: notes,
    },

    eventSource: f.Event_Source || null,

    decisionType: type,
    decisionConsensus: consensus,
    decisionNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
