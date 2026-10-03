import { normalizeOther } from "../OtherNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeOther",
  normalizeOther,
  "Other",
  "Other event",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Other_Description: "Care coordination call",
  },
  {
    eventSummary: "Other: Care coordination call",
    otherDescription: "Care coordination call",
    eventDetails: { otherDescription: "Care coordination call" },
  },
);
