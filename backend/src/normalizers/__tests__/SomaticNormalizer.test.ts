import { normalizeSomatic } from "../SomaticNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeSomatic",
  normalizeSomatic,
  "Somatic",
  "Somatic testing",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Somatic_Vendor: "Lab A",
    Somatic_Test_Type: "Tumor panel",
    Somatic_Key_Findings: ["FGFR3 alteration"],
    Somatic_PDL1_CPS: 12,
    Somatic_ERBB2_Expression: "Positive",
    Somatic_Notes: "Actionable finding",
  },
  {
    eventSummary: "Somatic panel: Lab A",
    somaticVendor: "Lab A",
    somaticTestType: "Tumor panel",
    somaticKeyFindings: ["FGFR3 alteration"],
    somaticPDL1CPS: 12,
    somaticERBB2Expression: "Positive",
    somaticNotes: "Actionable finding",
    eventDetails: {
      somaticVendor: "Lab A",
      somaticTestType: "Tumor panel",
      somaticKeyFindings: ["FGFR3 alteration"],
      somaticPDL1CPS: 12,
      somaticERBB2Expression: "Positive",
      somaticNotes: "Actionable finding",
    },
  },
);
