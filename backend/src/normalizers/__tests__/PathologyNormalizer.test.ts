import { normalizePathology } from "../PathologyNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizePathology",
  normalizePathology,
  "Pathology",
  "Pathology report",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Pathology_Histology: "Urothelial carcinoma",
    Pathology_Grade: "High",
    Pathology_Variant_Histology: ["Micropapillary"],
    Pathology_Depth: "Muscularis propria",
    Pathology_Margins: "Negative",
    Pathology_LVI: "Absent",
    Pathology_Notes: "Confirmed by pathology",
  },
  {
    eventSummary: "Pathology: Urothelial carcinoma, Grade High",
    pathologyHistology: "Urothelial carcinoma",
    pathologyGrade: "High",
    pathologyVariantHistology: ["Micropapillary"],
    pathologyDepth: "Muscularis propria",
    pathologyMargins: "Negative",
    pathologyLVI: "Absent",
    pathologyNotes: "Confirmed by pathology",
    eventDetails: {
      pathologyHistology: "Urothelial carcinoma",
      pathologyGrade: "High",
      pathologyVariantHistology: ["Micropapillary"],
      pathologyDepth: "Muscularis propria",
      pathologyMargins: "Negative",
      pathologyLVI: "Absent",
      pathologyNotes: "Confirmed by pathology",
    },
  },
);
