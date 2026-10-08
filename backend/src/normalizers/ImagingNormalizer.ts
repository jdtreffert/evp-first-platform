// src/normalizers/ImagingNormalizer.ts

import { pickField } from "../utils/pickField";
import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";

export function normalizeImaging(raw: RawEventRecord): UnifiedEvent {
  const f = raw.fields;

  const modality = f.Imaging_Modality || null;
  const result = f.Imaging_Result || null;
  const region = f.Imaging_Region || null;
  const contrast = f.Imaging_Contrast || null;
  const comparison = pickField(f, "Imaging_ComparisonToPrior", "Imaging_Comparison_To_Prior") || null;
  const notes = f.Imaging_Notes || null;

  const eventSummary = modality && result
    ? `${modality}: ${result}`
    : "Imaging study";

  return {
    uid: f.Event_UID || raw.id,
    masterId: f.Master_ID || "",
    eventType: "Imaging",
    eventDate: f.Event_Date || null,

    eventSummary,
    eventDetails: {
      imagingModality: modality,
      imagingResult: result,
      imagingRegion: region,
      imagingContrast: contrast,
      imagingComparisonToPrior: comparison,
      imagingNotes: notes,
    },

    eventSource: f.Event_Source || null,

    imagingModality: modality,
    imagingResult: result,
    imagingRegion: region,
    imagingContrast: contrast,
    imagingComparisonToPrior: comparison,
    imagingNotes: notes,

    documentAttachment: f.Document_Attachment || [],
    documentType: f.Document_Type || null,
    documentRedactionStatus: f.Document_Redaction_Status || null,

    payload: raw,
  };
}
