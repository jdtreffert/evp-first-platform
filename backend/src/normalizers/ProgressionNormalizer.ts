// src/normalizers/ProgressionNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeProgression(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const location = f.Progression_Location || null;
  const stageSpread = f.Progression_Stage_Spread || null;
  const modality = f.Progression_Modality || null;
  const stageChange = f.Progression_Stage_Change || null;
  const notes = f.Progression_Notes || null;

  const eventSummary = location
    ? `Progression: ${location}`
    : "Progression event";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Progression",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      progressionLocation: location,
      progressionStageSpread: stageSpread,
      progressionModality: modality,
      progressionStageChange: stageChange,
      progressionNotes: notes,
    },

    eventSource: f.Event_Source || null,

    progressionLocation: location,
    progressionStageSpread: stageSpread,
    progressionModality: modality,
    progressionStageChange: stageChange,
    progressionNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
