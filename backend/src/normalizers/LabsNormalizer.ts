// src/normalizers/LabsNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

const parseLabValues = (text: string | null): Record<string, string> => {
  if (!text) return {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const map: Record<string, string> = {};
  for (const line of lines) {
    const [key, value] = line.split(":").map(s => s.trim());
    if (key && value) map[key] = value;
  }
  return map;
};

export function normalizeLabs(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const labFlags = f.Lab_Flags || [];
  const labValues = parseLabValues(f.Lab_Values || null);
  const labSignificanceReasons = f.Lab_Significance_Reasons || [];
  const labNotes = f.Lab_Notes || null;

  const eventSummary =
    labFlags.length > 0
      ? `Labs: ${labFlags.join(", ")}`
      : "Labs: No flagged results";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Labs",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      labFlags,
      labValues,
      labSignificanceReasons,
      labNotes,
    },

    eventSource: f.Event_Source || null,

    labFlags,
    labValues,
    labSignificanceReasons,
    labNotes,

    triggeredDecisionId: f.Lab_Triggered_Decision_ID?.[0] || null,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
