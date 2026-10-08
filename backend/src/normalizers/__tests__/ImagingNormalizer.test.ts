import { normalizeImaging } from "../ImagingNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeImaging",
  normalizeImaging,
  "Imaging",
  "Imaging study",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Imaging_Modality: "CT",
    Imaging_Result: "No evidence of disease",
    Imaging_Region: "Chest",
    Imaging_Contrast: "IV Contrast",
    Imaging_Comparison_To_Prior: "Stable",
    Imaging_Notes: "Routine surveillance",
  },
  {
    eventSummary: "CT: No evidence of disease",
    imagingModality: "CT",
    imagingResult: "No evidence of disease",
    imagingRegion: "Chest",
    imagingContrast: "IV Contrast",
    imagingComparisonToPrior: "Stable",
    imagingNotes: "Routine surveillance",
    eventDetails: {
      imagingModality: "CT",
      imagingResult: "No evidence of disease",
      imagingRegion: "Chest",
      imagingContrast: "IV Contrast",
      imagingComparisonToPrior: "Stable",
      imagingNotes: "Routine surveillance",
    },
  },
);
