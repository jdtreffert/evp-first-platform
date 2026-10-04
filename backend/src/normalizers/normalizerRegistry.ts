// src/normalizers/normalizerRegistry.ts

import { normalizeDiagnosis } from "./DiagnosisNormalizer";
import { normalizeTURBT } from "./TURBTNormalizer";
import { normalizeCytology } from "./CytologyNormalizer";

import { normalizeImaging } from "./ImagingNormalizer";
import { normalizeImagingResponse } from "./ImagingResponseNormalizer";

import { normalizeCystoscopy } from "./CystoscopyNormalizer";
import { normalizeCystoscopyBiopsy } from "./CystoscopyBiopsyNormalizer";
import { normalizeTreatment } from "./TreatmentNormalizer";

import { normalizeSomatic } from "./SomaticNormalizer";
import { normalizeGermline } from "./GermlineNormalizer";
import { normalizeCtDNA } from "./ctDNANormalizer";
import { normalizeUtDNA } from "./utDNANormalizer";

import { normalizeTreatmentStart } from "./TreatmentStartNormalizer";
import { normalizeTreatmentChange } from "./TreatmentChangeNormalizer";
import { normalizeTreatmentResponse } from "./TreatmentResponseNormalizer";

import { normalizeRecurrence } from "./RecurrenceNormalizer";
import { normalizeProgression } from "./ProgressionNormalizer";

import { normalizeQoL } from "./QoLNormalizer";
import { normalizeSymptom } from "./SymptomNormalizer";

import { normalizeDecision } from "./DecisionNormalizer";

import { normalizeNote } from "./NoteNormalizer";
import { normalizeOther } from "./OtherNormalizer";
import { normalizeDocument } from "./DocumentNormalizer";
import { normalizeEventMeasure } from "./EventMeasureNormalizer";

import { normalizePathology } from "./PathologyNormalizer";

import { normalizeLab } from "./LabNormalizer";

import { NormalizerRegistry } from "../types/UnifiedEvents";

export const normalizerRegistry: NormalizerRegistry = {

  Diagnosis: normalizeDiagnosis,
  TURBT: normalizeTURBT,
  Cytology: normalizeCytology,

  Imaging: normalizeImaging,
  Imaging_Response: normalizeImagingResponse,

  Cystoscopy: normalizeCystoscopy,
  Cystoscopy_Biopsy: normalizeCystoscopyBiopsy,

  Somatic: normalizeSomatic,
  Germline: normalizeGermline,
  ctDNA: normalizeCtDNA,
  utDNA: normalizeUtDNA,

  Treatment: normalizeTreatment,
  Treatment_Start: normalizeTreatmentStart,
  Treatment_Change: normalizeTreatmentChange,
  Treatment_Response: normalizeTreatmentResponse,

  Recurrence: normalizeRecurrence,
  Progression: normalizeProgression,

  QoL: normalizeQoL,
  Symptom: normalizeSymptom,

  Lab: normalizeLab,

  Decision: normalizeDecision,

  Note: normalizeNote,
  Other: normalizeOther,
  Document: normalizeDocument,
  Event_Measure: normalizeEventMeasure,

  Pathology: normalizePathology,
};
