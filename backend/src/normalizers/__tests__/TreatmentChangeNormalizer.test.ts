import { normalizeTreatmentChange } from "../TreatmentChangeNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeTreatmentChange",
  normalizeTreatmentChange,
  "Treatment_Change",
  "Treatment change",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Treatment_Change_Type: "Dose reduction",
    Treatment_Change_Reason: "Toxicity",
    Treatment_Regimen_Details: "Reduce to 80%",
  },
  {
    eventSummary: "Treatment change: Dose reduction",
    treatmentChangeType: "Dose reduction",
    treatmentChangeReason: "Toxicity",
    treatmentRegimenDetails: "Reduce to 80%",
    eventDetails: {
      treatmentChangeType: "Dose reduction",
      treatmentChangeReason: "Toxicity",
      treatmentRegimenDetails: "Reduce to 80%",
    },
  },
);
