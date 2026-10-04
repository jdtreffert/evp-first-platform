/** Event_Type values in the schema documentation (Lab and Pathology are additions to the original 21). */
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
  "Lab",
  "Pathology",
] as const;

/** Registered types outside the schema list. Treatment is a dispatcher to the treatment event types. */
export const platformOnlyEventTypes = [
  "Document",
  "Event_Measure",
  "Treatment",
] as const;
