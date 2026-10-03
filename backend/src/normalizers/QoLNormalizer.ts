// src/normalizers/QoLNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeQoL(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const physical = f.QoL_Physical ?? null;
  const emotional = f.QoL_Emotional ?? null;
  const urinary = f.QoL_Urinary ?? null;
  const pain = f.QoL_Pain ?? null;
  const fatigue = f.QoL_Fatigue ?? null;
  const notes = f.QoL_Notes || null;

  const eventSummary = "Quality of Life assessment";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "QoL",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      qolPhysical: physical,
      qolEmotional: emotional,
      qolUrinary: urinary,
      qolPain: pain,
      qolFatigue: fatigue,
      qolNotes: notes,
    },

    eventSource: f.Event_Source || null,

    qolPhysical: physical,
    qolEmotional: emotional,
    qolUrinary: urinary,
    qolPain: pain,
    qolFatigue: fatigue,
    qolNotes: notes,

    payload: raw,
  };
}
