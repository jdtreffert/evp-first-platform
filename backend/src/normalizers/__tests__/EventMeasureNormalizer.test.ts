import { normalizeEventMeasure } from "../EventMeasureNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeEventMeasure",
  normalizeEventMeasure,
  "Event_Measure",
  "Event measure",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Event_Measure_Type: "Tumor size",
    Event_Measure_Value: 12,
    Event_Measure_Units: "mm",
  },
  {
    eventSummary: "Tumor size: 12 mm",
    eventMeasureType: "Tumor size",
    eventMeasureValue: 12,
    eventMeasureUnits: "mm",
    eventDetails: {
      eventMeasureType: "Tumor size",
      eventMeasureValue: 12,
      eventMeasureUnits: "mm",
    },
  },
);
