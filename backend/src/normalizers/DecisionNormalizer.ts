// src/normalizers/DecisionNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeDecision(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const type = f.Decision_Type || null;
  const consensus = f.Decision_Consensus || null;
  const recommendation = f.Decision_Physician_Recommendation || null;
  const preference = f.Decision_Patient_Preference || null;
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
      decisionPhysicianRecommendation: recommendation,
      decisionPatientPreference: preference,
      decisionNotes: notes,
    },

    eventSource: f.Event_Source || null,

    decisionType: type,
    decisionConsensus: consensus,
    decisionPhysicianRecommendation: recommendation,
    decisionPatientPreference: preference,
    decisionNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
