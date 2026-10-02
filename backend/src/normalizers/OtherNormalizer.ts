// src/normalizers/OtherNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeOther(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const description = f.Other_Description || null;

  const eventSummary = description
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

    payload: raw,
  };
}
