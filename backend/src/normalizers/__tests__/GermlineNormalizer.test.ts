import { normalizeGermline } from "../GermlineNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeGermline",
  normalizeGermline,
  "Germline",
  "Germline testing",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Germline_Vendor: "Lab A",
    Germline_Findings: ["BRCA1 variant"],
    Germline_Pathogenicity: "Pathogenic",
    Germline_Notes: "Genetic counseling recommended",
  },
  {
    eventSummary: "Germline testing: Lab A",
    germlineVendor: "Lab A",
    germlineFindings: ["BRCA1 variant"],
    germlinePathogenicity: "Pathogenic",
    germlineNotes: "Genetic counseling recommended",
    eventDetails: {
      germlineVendor: "Lab A",
      germlineFindings: ["BRCA1 variant"],
      germlinePathogenicity: "Pathogenic",
      germlineNotes: "Genetic counseling recommended",
    },
  },
);
