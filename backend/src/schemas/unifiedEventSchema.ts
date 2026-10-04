import { z } from "zod";
import { normalizerRegistry } from "../normalizers/normalizerRegistry";
import { isValidEventDate, isValidUid } from "../validation/fieldValidators";
import { rawEventRecordSchema } from "./rawEventRecordSchema";

const text = z.string().nullable().optional();
const num = z.number().finite().nullable().optional();
const textList = z.array(z.string()).optional();

const eventType = z
  .string()
  .refine((t) => Object.prototype.hasOwnProperty.call(normalizerRegistry, t), {
    message: "Unknown eventType (no registered normalizer)",
  });

// Strict so that fields missing from the schema are reported rather than silently accepted.
export const unifiedEventSchema = z.strictObject({
  uid: z.string().refine(isValidUid, {
    message: "Invalid uid: use 1-128 letters, digits, '_', '.', ':' or '-'",
  }),
  masterId: z.string().min(1, "masterId is required"),
  eventType,
  eventDate: z
    .string()
    .refine(isValidEventDate, { message: "Invalid date: expected a real YYYY-MM-DD or ISO 8601 date-time" })
    .nullable(),
  eventSummary: text,
  eventDetails: z.record(z.string(), z.any()).optional(),
  payload: rawEventRecordSchema,
  eventSource: text,

  documentAttachment: z.array(z.any()).optional(),
  documentType: text,
  documentRedactionStatus: text,

  labFlags: textList,
  labValues: z.record(z.string(), z.string()).optional(),
  labSignificanceReasons: textList,
  labNotes: text,
  triggeredDecisionId: text,

  imagingModality: text,
  imagingResult: text,
  imagingRegion: text,
  imagingComparisonToPrior: text,
  imagingNotes: text,

  imagingResponseCategory: text,
  imagingResponseCriteria: text,
  imagingResponseTargetLesionChange: num,

  pathologyHistology: text,
  pathologyGrade: text,
  pathologyVariantHistology: textList,
  pathologyDepth: text,
  pathologyMargins: text,
  pathologyLVI: text,
  pathologyNotes: text,

  diagnosisInitialPresentation: text,
  tumorStage: text,
  tumorT: text,
  tumorN: text,
  tumorM: text,

  turbtCompleteness: text,
  turbtSurgeonNotes: text,
  turbtSpecimenNotes: text,

  cystoscopyFindings: text,
  cystoscopyVisibility: text,
  cystoscopyReason: text,
  cystoscopyNotes: text,
  biopsyResult: text,
  biopsyTaken: text,
  biopsySite: text,
  biopsyNotes: text,

  cytologyResult: text,
  cytologyCategory: text,
  cytologySpecimen: text,
  cytologyNotes: text,

  somaticVendor: text,
  somaticTestType: text,
  somaticKeyFindings: textList,
  somaticPDL1CPS: num,
  somaticERBB2Expression: text,
  somaticNotes: text,

  germlineVendor: text,
  germlineFindings: textList,
  germlinePathogenicity: text,
  germlineNotes: text,

  ctDNAVendor: text,
  ctDNAAssayType: text,
  ctDNAValue: num,
  ctDNAUnits: text,
  ctDNATrend: text,

  utDNAVendor: text,
  utDNAAssayType: text,
  utDNAValue: num,
  utDNAUnits: text,
  utDNATrend: text,
  utDNANotes: text,

  treatmentName: text,
  treatmentCycle: num,
  treatmentIntent: text,
  treatmentRegimenDetails: text,
  treatmentPhysicianRecommendation: text,
  treatmentPatientPreference: text,

  eventMeasureType: text,
  eventMeasureValue: z.union([z.string(), z.number().finite()]).nullable().optional(),
  eventMeasureUnits: text,
  noteText: text,
  otherDescription: text,

  treatmentChangeType: text,
  treatmentChangeReason: text,
  treatmentChangeNewRegimen: text,
  treatmentChangeToxicityGrade: num,

  treatmentResponseCategory: text,
  treatmentResponseModality: text,
  treatmentResponseNotes: text,

  decisionType: text,
  decisionConsensus: text,
  decisionNotes: text,

  symptomDescription: text,
  symptomType: text,
  symptomSeverity: num,
  symptomDuration: num,
  symptomDurationUnits: text,

  qolPhysical: num,
  qolEmotional: num,
  qolUrinary: num,
  qolPain: num,
  qolFatigue: num,
  qolNotes: text,

  recurrenceLocation: text,
  recurrenceSpreadCategory: text,
  recurrenceModality: text,
  recurrenceConfirmation: text,
  recurrenceNotes: text,

  progressionLocation: text,
  progressionStageSpread: text,
  progressionModality: text,
  progressionStageChange: text,
  progressionNotes: text,
});
