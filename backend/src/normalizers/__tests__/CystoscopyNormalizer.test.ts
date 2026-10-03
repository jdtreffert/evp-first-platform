import { normalizeCystoscopy } from "../CystoscopyNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeCystoscopy",
  normalizeCystoscopy,
  "Cystoscopy",
  "Cystoscopy",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Cystoscopy_Findings: "No visible tumor",
    Cystoscopy_Visibility: "Good",
    Cystoscopy_Reason: "Surveillance",
    Cystoscopy_Notes: "Unremarkable exam",
  },
  {
    eventSummary: "Cystoscopy: No visible tumor",
    cystoscopyFindings: "No visible tumor",
    cystoscopyVisibility: "Good",
    cystoscopyReason: "Surveillance",
    cystoscopyNotes: "Unremarkable exam",
    eventDetails: {
      cystoscopyFindings: "No visible tumor",
      cystoscopyVisibility: "Good",
      cystoscopyReason: "Surveillance",
      cystoscopyNotes: "Unremarkable exam",
    },
  },
);
