/** Event_Type options defined in the Airtable single-select field. */
export const airtableEventTypes = [
  "Diagnosis",
  "TURBT",
  "Cytology",
  "Imaging",
  "Imaging_Response",
  "Cystoscopy",
  "Cystoscopy_Biopsy",
  "Somatic",
  "Germline",
  "ctDNA",
  "utDNA",
  "Treatment_Start",
  "Treatment_Change",
  "Treatment_Response",
  "Recurrence",
  "Progression",
  "QoL",
  "Symptom",
  "Decision",
  "Note",
  "Other",
] as const;

/** Registered platform event types that have no Airtable Event_Type option yet. */
export const platformOnlyEventTypes = [
  "Labs",
  "Pathology",
  "Document",
  "Event_Measure",
  "Treatment",
  "Treatment_Outcome",
  "Treatment_Regimen_Details",
] as const;
