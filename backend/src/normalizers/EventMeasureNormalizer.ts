// src/normalizers/EventMeasureNormalizer.ts

import { pickField } from "../utils/pickField";
import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeEventMeasure(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const measureType = f.Event_Measure_Type || null;
  const value = pickField(f, "Numeric_Value", "Event_Measure_Value") ?? null;
  const units = pickField(f, "Numeric_Units", "Event_Measure_Units") || null;

  const eventSummary = measureType
    ? `${measureType}: ${value} ${units || ""}`.trim()
    : "Event measure";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Event_Measure",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      eventMeasureType: measureType,
      eventMeasureValue: value,
      eventMeasureUnits: units,
    },

    eventSource: f.Event_Source || null,

    eventMeasureType: measureType,
    eventMeasureValue: value,
    eventMeasureUnits: units,

    payload: raw,
  };
}
