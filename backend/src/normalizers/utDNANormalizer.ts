// src/normalizers/utDNANormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeUtDNA(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const vendor = f.utDNA_Vendor || null;
  const assayType = f.utDNA_Assay_Type || null;
  const value = f.utDNA_Value || null;
  const units = f.utDNA_Units || null;
  const trend = f.utDNA_Trend || null;
  const notes = f.utDNA_Notes || null;

  const eventSummary = value !== null
    ? `utDNA: ${value} ${units || ""}`.trim()
    : "utDNA result";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "utDNA",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      utDNAVendor: vendor,
      utDNAAssayType: assayType,
      utDNAValue: value,
      utDNAUnits: units,
      utDNATrend: trend,
      utDNANotes: notes,
    },

    eventSource: f.Event_Source || null,

    utDNAVendor: vendor,
    utDNAAssayType: assayType,
    utDNAValue: value,
    utDNAUnits: units,
    utDNATrend: trend,
    utDNANotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
