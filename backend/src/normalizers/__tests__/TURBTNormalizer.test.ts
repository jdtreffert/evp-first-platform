import { normalizeTURBT } from "../TURBTNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeTURBT",
  normalizeTURBT,
  "TURBT",
  "TURBT",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    TURBT_Completeness: "Complete",
    TURBT_Surgeon_Notes: "Deep muscle sampled",
    TURBT_Specimen_Notes: "Sent in two containers",
  },
  {
    eventSummary: "TURBT: Complete resection",
    turbtCompleteness: "Complete",
    turbtSurgeonNotes: "Deep muscle sampled",
    turbtSpecimenNotes: "Sent in two containers",
    eventDetails: {
      turbtCompleteness: "Complete",
      turbtSurgeonNotes: "Deep muscle sampled",
      turbtSpecimenNotes: "Sent in two containers",
    },
  },
);
