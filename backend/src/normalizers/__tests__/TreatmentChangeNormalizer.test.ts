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
    Treatment_Change_New_Regimen: "Regimen B",
    Treatment_Change_Toxicity_Grade: 2,
  },
  {
    eventSummary: "Treatment change: Dose reduction",
    treatmentChangeType: "Dose reduction",
    treatmentChangeReason: "Toxicity",
    treatmentChangeNewRegimen: "Regimen B",
    treatmentChangeToxicityGrade: 2,
    eventDetails: {
      treatmentChangeType: "Dose reduction",
      treatmentChangeReason: "Toxicity",
      treatmentChangeNewRegimen: "Regimen B",
      treatmentChangeToxicityGrade: 2,
    },
  },
);
