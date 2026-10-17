/** Event_Type values in the schema documentation (the original 21 minus Other, plus Lab, Pathology, Treatment_Delivery, Procedure and Disease_Status). */
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
  "Disease_Status",
  "QoL",
  "Symptom",
  "Decision",
  "Note",
  "Lab",
  "Pathology",
  "Treatment_Delivery",
  "Procedure",
] as const;

/** Registered types outside the schema list. Treatment is a dispatcher to the treatment event types. */
export const platformOnlyEventTypes = [
  "Treatment",
] as const;
