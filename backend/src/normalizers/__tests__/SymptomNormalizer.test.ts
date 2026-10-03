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
