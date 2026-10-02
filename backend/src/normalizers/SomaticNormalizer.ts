// src/normalizers/SomaticNormalizer.ts

import { AirtableRecord, NormalizedEvent } from "../types/UnifiedEvents";

export function normalizeSomatic(raw: AirtableRecord): NormalizedEvent {
  const f = raw.fields;

  const vendor = f.Somatic_Vendor || null;
  const testType = f.Somatic_Test_Type || null;
  const findings = f.Somatic_Key_Findings || [];
  const pdl1 = f.Somatic_PDL1_CPS || null;
  const erbb2 = f.Somatic_ERBB2_Expression || null;
  const notes = f.Somatic_Notes || null;

  const eventSummary = vendor
    ? `Somatic panel: ${vendor}`
    : "Somatic testing";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Somatic",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      somaticVendor: vendor,
      somaticTestType: testType,
      somaticKeyFindings: findings,
      somaticPDL1CPS: pdl1,
      somaticERBB2Expression: erbb2,
      somaticNotes: notes,
    },

    eventSource: f.Event_Source || null,

    somaticVendor: vendor,
    somaticTestType: testType,
    somaticKeyFindings: findings,
    somaticPDL1CPS: pdl1,
    somaticERBB2Expression: erbb2,
    somaticNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
