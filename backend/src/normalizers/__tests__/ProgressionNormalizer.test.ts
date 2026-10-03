import { normalizeProgression } from "../ProgressionNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeProgression",
  normalizeProgression,
  "Progression",
  "Progression event",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Progression_Location: "Lung",
    Progression_Stage_Spread: "Distant",
    Progression_Modality: "Imaging",
    Progression_Stage_Change: "Stage IV",
    Progression_Notes: "New lesion identified",
  },
  {
    eventSummary: "Progression: Lung",
    progressionLocation: "Lung",
    progressionStageSpread: "Distant",
    progressionModality: "Imaging",
    progressionStageChange: "Stage IV",
    progressionNotes: "New lesion identified",
    eventDetails: {
      progressionLocation: "Lung",
      progressionStageSpread: "Distant",
      progressionModality: "Imaging",
      progressionStageChange: "Stage IV",
      progressionNotes: "New lesion identified",
    },
  },
);
