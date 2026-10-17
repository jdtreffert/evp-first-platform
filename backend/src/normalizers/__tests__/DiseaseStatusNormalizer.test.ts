import { normalizeDiseaseStatus } from "../DiseaseStatusNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeDiseaseStatus",
  normalizeDiseaseStatus,
  "Disease_Status",
  "Disease status",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2026-08-15",
    Event_Source: "Patient",
    Disease_Status_Category: "No evidence of disease",
    Disease_Status_Extent: "Not specified",
    Disease_Status_Basis: "Patient recorded from clinician communication",
    Disease_Status_Confidence: "Probable",
    Disease_Status_Notes: "Told at the 8/15 visit",
  },
  {
    eventSummary: "Disease status: No evidence of disease",
    eventSource: "Patient",
    diseaseStatusCategory: "No evidence of disease",
    diseaseStatusExtent: "Not specified",
    diseaseStatusBasis: "Patient recorded from clinician communication",
    diseaseStatusConfidence: "Probable",
    diseaseStatusNotes: "Told at the 8/15 visit",
    eventDetails: {
      diseaseStatusCategory: "No evidence of disease",
      diseaseStatusExtent: "Not specified",
      diseaseStatusBasis: "Patient recorded from clinician communication",
      diseaseStatusConfidence: "Probable",
      diseaseStatusNotes: "Told at the 8/15 visit",
    },
  },
);
