import { ingestEvent } from "../../services/ingestionService";
import { normalizeSymptom } from "../SymptomNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeSymptom",
  normalizeSymptom,
  "Symptom",
  "Symptom event",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Symptom_Description: "Nausea",
    Symptom_Type: "Gastrointestinal",
    Symptom_Severity: 2,
    Symptom_Duration: 3,
    Symptom_Duration_Units: "days",
  },
  {
    eventSummary: "Symptom: Nausea",
    symptomDescription: "Nausea",
    symptomType: "Gastrointestinal",
    symptomSeverity: 2,
    symptomDuration: 3,
    symptomDurationUnits: "days",
    eventDetails: {
      symptomDescription: "Nausea",
      symptomType: "Gastrointestinal",
      symptomSeverity: 2,
      symptomDuration: 3,
      symptomDurationUnits: "days",
    },
  },
);

describe("Symptom_Status and duration in years", () => {
  const base = { Master_ID: "M1", Event_Date: "2025-05-06", Event_Type: "Symptom", Event_UID: "s1", Symptom_Type: "Fatigue" };

  test("accepts each status and days and years as duration units", () => {
    for (const status of ["Active", "Improving", "Resolved", "Persistent", "Unknown"]) {
      expect(ingestEvent({ id: "s1", fields: { ...base, Symptom_Status: status } }).symptomStatus).toBe(status);
    }
    const event = ingestEvent({ id: "s1", fields: { ...base, Symptom_Duration: 2, Symptom_Duration_Units: "years" } });
    expect(ingestEvent({ id: "s1", fields: { ...base, Symptom_Duration_Units: "days" } }).symptomDurationUnits).toBe("days");
    expect(event).toMatchObject({ symptomDuration: 2, symptomDurationUnits: "years" });
  });

  test("rejects an unknown status", () => {
    expect(() => ingestEvent({ id: "s1", fields: { ...base, Symptom_Status: "Gone" } })).toThrow();
  });
});
