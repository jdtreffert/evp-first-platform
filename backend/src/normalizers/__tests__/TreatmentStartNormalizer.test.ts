import { normalizeTreatmentStart } from "../TreatmentStartNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeTreatmentStart",
  normalizeTreatmentStart,
  "Treatment_Start",
  "Treatment start",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Treatment_Name: "Drug A",
    Treatment_Cycle: 2,
    Treatment_Intent: "Curative",
  },
  {
    eventSummary: "Treatment start: Drug A",
    treatmentName: "Drug A",
    treatmentCycle: 2,
    treatmentIntent: "Curative",
    eventDetails: {
      treatmentName: "Drug A",
      treatmentCycle: 2,
      treatmentIntent: "Curative",
    },
  },
);
