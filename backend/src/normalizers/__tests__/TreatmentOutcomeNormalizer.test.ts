import { normalizeTreatmentOutcome } from "../TreatmentOutcomeNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeTreatmentOutcome",
  normalizeTreatmentOutcome,
  "Treatment_Outcome",
  "Treatment outcome",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Treatment_Outcome: "Completed",
  },
  {
    eventSummary: "Treatment outcome: Completed",
    treatmentOutcome: "Completed",
    eventDetails: { treatmentOutcome: "Completed" },
  },
);
