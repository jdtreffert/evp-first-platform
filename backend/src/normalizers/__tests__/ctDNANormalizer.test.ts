import { normalizeCtDNA } from "../ctDNANormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeCtDNA",
  normalizeCtDNA,
  "ctDNA",
  "ctDNA result",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    ctDNA_Vendor: "Lab A",
    ctDNA_Assay_Type: "Tumor-informed",
    ctDNA_Value: 1.25,
    ctDNA_Units: "MTM/mL",
    ctDNA_Trend: "Decreasing",
  },
  {
    eventSummary: "ctDNA: 1.25 MTM/mL",
    ctDNAVendor: "Lab A",
    ctDNAAssayType: "Tumor-informed",
    ctDNAValue: 1.25,
    ctDNAUnits: "MTM/mL",
    ctDNATrend: "Decreasing",
    eventDetails: {
      ctDNAVendor: "Lab A",
      ctDNAAssayType: "Tumor-informed",
      ctDNAValue: 1.25,
      ctDNAUnits: "MTM/mL",
      ctDNATrend: "Decreasing",
    },
  },
);
