import { normalizeTreatmentRegimenDetails } from "../TreatmentRegimenDetailsNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeTreatmentRegimenDetails",
  normalizeTreatmentRegimenDetails,
  "Treatment_Regimen_Details",
  "Regimen details",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Treatment_Regimen_Details: "Drug A on days 1 and 8",
  },
  {
    eventSummary: "Regimen details updated",
    treatmentRegimenDetails: "Drug A on days 1 and 8",
    eventDetails: {
      treatmentRegimenDetails: "Drug A on days 1 and 8",
    },
  },
);
