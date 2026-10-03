import { normalizeCystoscopyBiopsy } from "../CystoscopyBiopsyNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeCystoscopyBiopsy",
  normalizeCystoscopyBiopsy,
  "Cystoscopy_Biopsy",
  "Cystoscopy biopsy",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Biopsy_Result: "Benign",
    Biopsy_Site: "Bladder",
    Biopsy_Notes: "No malignancy identified",
  },
  {
    eventSummary: "Biopsy: Benign",
    biopsyResult: "Benign",
    biopsySite: "Bladder",
    biopsyNotes: "No malignancy identified",
    eventDetails: {
      biopsyResult: "Benign",
      biopsySite: "Bladder",
      biopsyNotes: "No malignancy identified",
    },
  },
);
