import { normalizeDiagnosis } from "../DiagnosisNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeDiagnosis",
  normalizeDiagnosis,
  "Diagnosis",
  "Diagnosis event",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Diagnosis_Histology: "Urothelial carcinoma",
    Diagnosis_Grade: "High",
    Diagnosis_Variant_Histology: ["Micropapillary"],
    Diagnosis_Depth: "Muscularis propria",
    Diagnosis_Margins: "Negative",
    Diagnosis_LVI: "Absent",
    Diagnosis_Notes: "Confirmed by pathology",
  },
  {
    eventSummary: "Diagnosis: Urothelial carcinoma, Grade High",
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
