import { eventFieldCatalog } from "./eventFieldCatalog";

/** Fields every event type accepts. */
/** Optional attributes that relate an event to another event by its UID. */
export const relationshipFields = ["Event_Related_UID", "Event_Relationship"] as const;

/**
 * Event types that offer a list of related events to choose from: the event types listed,
 * the window in days either side of the event's own date (or all preceding events), and the
 * relationship recorded by default.
 * Other event types offer no related-event picker.
 */
export const relatedEventCandidates: Record<
  string,
  { eventTypes: string[]; relationship: string } & (
    | { withinDays: number }
    // No date range: every earlier or same-day event of the listed types is offered.
    | { allPrecedingEvents: true }
  )
> = {
  Imaging: {
    eventTypes: ["Symptom", "Pathology", "Decision", "Recurrence", "Progression", "Treatment_Response"],
    withinDays: 90,
    relationship: "Related_To",
  },
  Cystoscopy: { eventTypes: ["Symptom", "Imaging"], withinDays: 90, relationship: "Related_To" },
  TURBT: { eventTypes: ["Cystoscopy"], withinDays: 30, relationship: "Related_To" },
  Pathology: { eventTypes: ["TURBT", "Cystoscopy_Biopsy"], withinDays: 30, relationship: "Derived_From" },
  Diagnosis: {
    eventTypes: ["Cystoscopy", "Cystoscopy_Biopsy", "Pathology", "Imaging"],
    withinDays: 90,
    relationship: "Derived_From",
  },
  Decision: { eventTypes: ["Diagnosis"], withinDays: 90, relationship: "Related_To" },
  Treatment_Start: { eventTypes: ["Decision", "Diagnosis"], withinDays: 90, relationship: "Related_To" },
  // A delivery can follow its Treatment_Start by a year or more, so no date window is applied.
  Treatment_Delivery: { eventTypes: ["Treatment_Start"], allPrecedingEvents: true, relationship: "Related_To" },
};

export const commonEventFields = ["Event_Date", "Event_Source"] as const;

/** Optional single measurement (type, numeric value, free-text units) that any event may carry. */
export const measureFields = ["Event_Measure_Type", "Numeric_Value", "Numeric_Units"] as const;

/** Optional attributes that link any event to a document; a document is not an event itself. */
export const documentFields = ["Document_Attachment", "Document_Type", "Document_Redaction_Status"] as const;

/**
 * Schema fields entered for each event type. Treatment is only a dispatcher, not an event type to enter.
 */
export const eventTypeFields: Record<string, readonly string[]> = {
  Diagnosis: [
    "Diagnosis_Histology", "Diagnosis_Grade", "Diagnosis_Variant_Histology",
    "Diagnosis_Initial_Presentation", "T", "N", "M", "Stage",
  ],
  TURBT: ["TURBT_Completeness", "TURBT_Surgeon_Notes", "TURBT_Specimen_Notes"],
  Pathology: [
    "Pathology_Histology", "Pathology_Grade", "Pathology_Variant_Histology",
    "Pathology_Depth", "Pathology_Margins", "Pathology_LVI", "Pathology_Notes",
  ],
  Cytology: ["Cytology_Result", "Cytology_Category", "Cytology_Specimen", "Cytology_Notes"],
  Imaging: ["Imaging_Modality", "Imaging_Contrast", "Imaging_Region", "Imaging_Result", "Imaging_ComparisonToPrior", "Imaging_Notes"],
  Imaging_Response: [
    "Imaging_Response_Category", "Imaging_Response_Critera", "Imaging_Response_Target_Lesion_Change",
  ],
  Cystoscopy: [
    "Cystoscopy_Reason", "Cystoscopy_Findings", "Cystoscopy_Visibility", "Cystoscopy_Notes",
  ],
  Cystoscopy_Biopsy: [
    "Cystoscopy_Biopsy_Taken", "Cystoscopy_Biopsy_Result", "Cystoscopy_Biopsy_Site", "Cystoscopy_Biopsy_Notes",
  ],
  Somatic: [
    "Somatic_Vendor", "Somatic_Test_Type", "Somatic_Key_Findings", "Somatic_PD_L1_CPS",
    "Somatic_ERBB2_Expression", "Somatic_Notes",
  ],
  Germline: ["Germline_Vendor", "Germline_Findings", "Germline_Pathogenicity", "Germline_Notes"],
  ctDNA: ["ctDNA_Vendor", "ctDNA_Assay_Type", "ctDNA_Value", "ctDNA_Units", "ctDNA_Trend"],
  utDNA: ["utDNA_Vendor", "utDNA_Assay_Type", "utDNA_Value", "utDNA_Units", "utDNA_Trend", "utDNA_Notes"],
  Treatment_Start: [
    "Treatment_Name", "Treatment_Intent", "Treatment_Route", "Treatment_Regimen_Details",
    "Treatment_Physician_Recommendation", "Treatment_Patient_Preference",
  ],
  Treatment_Delivery: [
    "Treatment_Name", "Treatment_Cycle", "Treatment_Route", "Treatment_Dose", "Treatment_Dose_Units",
    "Treatment_Delivery_Status", "Treatment_Delivery_Notes",
  ],
  Treatment_Change: [
    "Treatment_Name", "Treatment_Change_Type", "Treatment_Change_Reason", "Treatment_Regimen_Details",
    "Treatment_Change_New_Regimen", "Treatment_Change_Toxicity_Grade",
  ],
  Treatment_Response: [
    "Treatment_Name", "Treatment_Response_Category", "Treatment_Response_Modality", "Treatment_Response_Notes",
  ],
  Recurrence: [
    "Recurrence_Location", "Recurrence_Spread_Category", "Recurrence_Modality",
    "Recurrence_Confirmation", "Recurrence_Notes",
  ],
  Progression: [
    "Progression_Location", "Progression_Stage_Spread", "Progression_Modality",
    "Progression_Stage_Change", "Progression_Notes",
  ],
  QoL: ["QoL_Physical", "Qol_Emotional", "QoL_Urinary", "QoL_Pain", "QoL_Fatigue", "Qol_Notes"],
  Symptom: [
    "Symptom_Type", "Symptom_Description", "Symptom_Severity", "Symptom_Duration", "Symptom_Duration_Units",
  ],
  Decision: ["Decision_Type", "Decision_Consensus", "Decision_Notes"],
  Note: ["Event_Summary", "Event_Details"],
  Lab: ["Lab_Flags", "Lab_Values", "Lab_Significance_Reasons", "Lab_Notes"],
};

for (const [type, fields] of Object.entries(eventTypeFields)) {
  for (const field of fields) {
    if (!eventFieldCatalog[field]) throw new Error(`eventTypeFields.${type} references unknown field ${field}`);
  }
}
