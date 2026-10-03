// src/normalizers/ctDNANormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeCtDNA(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const vendor = f.ctDNA_Vendor || null;
  const assayType = f.ctDNA_Assay_Type || null;
  const value = f.ctDNA_Value || null;
  const units = f.ctDNA_Units || null;
  const trend = f.ctDNA_Trend || null;

  const eventSummary = value !== null
    ? `ctDNA: ${value} ${units || ""}`.trim()
    : "ctDNA result";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "ctDNA",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      ctDNAVendor: vendor,
      ctDNAAssayType: assayType,
      ctDNAValue: value,
      ctDNAUnits: units,
      ctDNATrend: trend,
    },

    eventSource: f.Event_Source || null,

    ctDNAVendor: vendor,
    ctDNAAssayType: assayType,
    ctDNAValue: value,
    ctDNAUnits: units,
    ctDNATrend: trend,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
