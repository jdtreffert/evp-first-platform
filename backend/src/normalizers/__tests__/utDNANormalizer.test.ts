import { normalizeUtDNA } from "../utDNANormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeUtDNA",
  normalizeUtDNA,
  "utDNA",
  "utDNA result",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    utDNA_Vendor: "Lab A",
    utDNA_Assay_Type: "Urine assay",
    utDNA_Value: 1.25,
    utDNA_Units: "copies/mL",
    utDNA_Trend: "Stable",
    utDNA_Notes: "Repeat testing planned",
  },
  {
    eventSummary: "utDNA: 1.25 copies/mL",
    utDNAVendor: "Lab A",
    utDNAAssayType: "Urine assay",
    utDNAValue: 1.25,
    utDNAUnits: "copies/mL",
    utDNATrend: "Stable",
    utDNANotes: "Repeat testing planned",
    eventDetails: {
      utDNAVendor: "Lab A",
      utDNAAssayType: "Urine assay",
      utDNAValue: 1.25,
      utDNAUnits: "copies/mL",
      utDNATrend: "Stable",
      utDNANotes: "Repeat testing planned",
    },
  },
);
