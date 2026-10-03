import { normalizeCytology } from "../CytologyNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeCytology",
  normalizeCytology,
  "Cytology",
  "Cytology result",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Cytology_Result: "Negative",
    Cytology_Category: "Atypical",
    Cytology_Specimen: "Urine",
    Cytology_Notes: "Adequate specimen",
  },
  {
    eventSummary: "Cytology: Negative",
    cytologyResult: "Negative",
    cytologyCategory: "Atypical",
    cytologySpecimen: "Urine",
    cytologyNotes: "Adequate specimen",
    eventDetails: {
      cytologyResult: "Negative",
      cytologyCategory: "Atypical",
      cytologySpecimen: "Urine",
      cytologyNotes: "Adequate specimen",
    },
  },
);
