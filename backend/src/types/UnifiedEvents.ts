/**
 * Raw ingestion input: a source-agnostic record with an identifier and a flat
 * map of source field names (e.g. Event_UID, Event_Type, Event_Date).
 * Normalizers convert this into a UnifiedEvent.
 */
export interface RawEventRecord {
  id: string;
  fields: Record<string, any>;
}

/**
 * Canonical event type for ALL event categories.
 * Each block contributes optional fields.
 */
export interface UnifiedEvent {
  uid: string;
  masterId: string;
  eventType: string;

  // Core shared fields
  eventDate: string | null;
  eventSummary?: string | null;
  eventDetails?: Record<string, any>;
  payload: RawEventRecord;

  // Source (Patient, Clinician, Lab, Imaging Center, etc.)
  eventSource?: string | null;

  // Set by the server when the event is stored; never taken from the client.
  recordedAt?: string;
  recordedByRole?: string;
  lastModifiedAt?: string;
  lastModifiedByRole?: string;

  // Link to another event (for example a lab that triggered a decision)
  relatedEventUid?: string | null;
  eventRelationship?: string | null;

  // Document block (shared across many event types)
  documentAttachment?: any[];
  documentType?: string | null;
  documentRedactionStatus?: string | null;

  // Lab block
  labFlags?: string[];
  labValues?: Record<string, string>;
  labSignificanceReasons?: string[];
  labNotes?: string | null;

  // Imaging block
  imagingModality?: string | null;
  imagingResult?: string | null;
  imagingRegion?: string | null;
  imagingContrast?: string | null;
  imagingComparisonToPrior?: string | null;
  imagingNotes?: string | null;

  // Imaging Response block
  imagingResponseCategory?: string | null;
  imagingResponseCriteria?: string | null;
  imagingResponseTargetLesionChange?: number | null;

  // Pathology block (Diagnosis, TURBT, Biopsy)
  pathologyHistology?: string | null;
  pathologyGrade?: string | null;
  pathologyVariantHistology?: string[];
  pathologyDepth?: string | null;
  pathologyMargins?: string | null;
  pathologyLVI?: string | null;
  pathologyNotes?: string | null;

  // Diagnosis staging
  diagnosisInitialPresentation?: string | null;
  tumorStage?: string | null;
  tumorT?: string | null;
  tumorN?: string | null;
  tumorM?: string | null;

  // TURBT-specific block
  turbtCompleteness?: string | null;
  turbtSurgeonNotes?: string | null;
  turbtSpecimenNotes?: string | null;

  // Cystoscopy and biopsy blocks
  cystoscopyFindings?: string | null;
  cystoscopyVisibility?: string | null;
  cystoscopyReason?: string | null;
  cystoscopyNotes?: string | null;
  biopsyTaken?: string | null;
  biopsyResult?: string | null;
  biopsySite?: string | null;
  biopsyNotes?: string | null;

  // Cytology block
  cytologyResult?: string | null;
  cytologyCategory?: string | null;
  cytologySpecimen?: string | null;
  cytologyNotes?: string | null;

  // Somatic block
  somaticVendor?: string | null;
  somaticTestType?: string | null;
  somaticKeyFindings?: string[];
  somaticPDL1CPS?: number | null;
  somaticERBB2Expression?: string | null;
  somaticNotes?: string | null;

  // Germline block
  germlineVendor?: string | null;
  germlineFindings?: string[];
  germlinePathogenicity?: string | null;
  germlineNotes?: string | null;

  // ctDNA block
  ctDNAVendor?: string | null;
  ctDNAAssayType?: string | null;
  ctDNAValue?: number | null;
  ctDNAUnits?: string | null;
  ctDNATrend?: string | null;

  // utDNA block
  utDNAVendor?: string | null;
  utDNAAssayType?: string | null;
  utDNAValue?: number | null;
  utDNAUnits?: string | null;
  utDNATrend?: string | null;
  utDNANotes?: string | null;

  // Treatment blocks
  treatmentName?: string | null;
  treatmentCycle?: number | null;
  treatmentIntent?: string | null;
  treatmentRegimenDetails?: string | null;
  treatmentRoute?: string | null;

  // Treatment delivery block
  treatmentDose?: number | null;
  treatmentDoseUnits?: string | null;
  treatmentDeliveryStatus?: string | null;
  treatmentDeliveryNotes?: string | null;

  // Other event blocks
  eventMeasureType?: string | null;
  eventMeasureValue?: number | null;
  eventMeasureUnits?: string | null;
  noteText?: string | null;

  treatmentChangeType?: string | null;
  treatmentChangeReason?: string | null;
  treatmentChangeNewRegimen?: string | null;
  treatmentChangeToxicityGrade?: number | null;

  treatmentResponseCategory?: string | null;
  treatmentResponseModality?: string | null;
  treatmentResponseNotes?: string | null;

  // Decision block
  decisionType?: string | null;
  decisionConsensus?: string | null;
  decisionPhysicianRecommendation?: string | null;
  decisionPatientPreference?: string | null;
  decisionNotes?: string | null;

  // Symptom block
  symptomDescription?: string | null;
  symptomType?: string | null;
  symptomSeverity?: number | null;
  symptomDuration?: number | null;
  symptomDurationUnits?: string | null;

  // QoL block
  qolPhysical?: number | null;
  qolEmotional?: number | null;
  qolUrinary?: number | null;
  qolPain?: number | null;
  qolFatigue?: number | null;
  qolNotes?: string | null;

  // Recurrence block
  recurrenceLocation?: string | null;
  recurrenceSpreadCategory?: string | null;
  recurrenceModality?: string | null;
  recurrenceConfirmation?: string | null;
  recurrenceNotes?: string | null;

  // Progression block
  progressionLocation?: string | null;
  progressionStageSpread?: string | null;
  progressionModality?: string | null;
  progressionStageChange?: string | null;
  progressionNotes?: string | null;
}

export type EventNormalizer = (raw: RawEventRecord) => UnifiedEvent;

export interface NormalizerRegistry {
  [eventType: string]: EventNormalizer;
}
