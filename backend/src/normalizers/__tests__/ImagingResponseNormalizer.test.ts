import { normalizeImagingResponse } from "../ImagingResponseNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeImagingResponse",
  normalizeImagingResponse,
  "Imaging_Response",
  "Imaging response",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Imaging_Response_Category: "Partial response",
    Imaging_Response_Criteria: "RECIST",
    Imaging_Response_Target_Lesion_Change: -25,
  },
  {
    eventSummary: "Imaging response: Partial response",
    imagingResponseCategory: "Partial response",
    imagingResponseCriteria: "RECIST",
    imagingResponseTargetLesionChange: -25,
    eventDetails: {
      imagingResponseCategory: "Partial response",
      imagingResponseCriteria: "RECIST",
      imagingResponseTargetLesionChange: -25,
    },
  },
);
