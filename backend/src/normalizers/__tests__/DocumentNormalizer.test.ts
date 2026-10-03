import { normalizeDocument } from "../DocumentNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeDocument",
  normalizeDocument,
  "Document",
  "Document",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Document_Attachment: [{ url: "https://example.test/report.pdf" }],
    Document_Type: "Pathology report",
    Document_Redaction_Status: "Reviewed",
  },
  {
    eventSummary: "Document: Pathology report",
    documentAttachment: [{ url: "https://example.test/report.pdf" }],
    documentType: "Pathology report",
    documentRedactionStatus: "Reviewed",
    eventDetails: {
      documentAttachment: [{ url: "https://example.test/report.pdf" }],
      documentType: "Pathology report",
      documentRedactionStatus: "Reviewed",
    },
  },
);
