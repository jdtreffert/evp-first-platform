import { normalizeTreatmentResponse } from "../TreatmentResponseNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeTreatmentResponse",
  normalizeTreatmentResponse,
  "Treatment_Response",
  "Treatment response",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Treatment_Response_Category: "Partial response",
    Treatment_Response_Modality: "Imaging",
    Treatment_Response_Notes: "Tumor burden decreased",
  },
  {
    eventSummary: "Treatment response: Partial response",
    treatmentResponseCategory: "Partial response",
    treatmentResponseModality: "Imaging",
    treatmentResponseNotes: "Tumor burden decreased",
    eventDetails: {
      treatmentResponseCategory: "Partial response",
      treatmentResponseModality: "Imaging",
      treatmentResponseNotes: "Tumor burden decreased",
    },
  },
);
